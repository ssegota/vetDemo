"""
Orkestrira tok: keywords → semantic router → (fallback) Sonnet → write-back u bazu.

Konfiguracija via env varijable:
  BAZA_S3_BUCKET  — S3 bucket (obavezno za Lambda; bez njega koristi lokalni fajl)
  BAZA_S3_KEY     — S3 ključ (default: semantic-router/baza.json)
  BEDROCK_REGION  — region za Bedrock (default: us-east-1)

Lambda entry point: orchestrator.lambda_handler
CLI korištenje:
  from orchestrator import Orchestrator
  orch = Orchestrator()
  result = orch.query(["neutrofilan", "infiltrat", "subkutis"])
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Optional

import boto3

from hybrid_router import (
    DEFAULT_BAZA,
    BEDROCK_REGION,
    S3_BUCKET,
    S3_KEY,
    HybridRetriever,
    build_hybrid,
    get_retriever,
)

SONNET_MODEL_ID = os.environ.get("GENERATOR_MODEL_ID", "us.anthropic.claude-sonnet-4-6-20250514-v1:0")

SYSTEM_PROMPT = """
Ti si iskusan veterinarski patolog koji piše histopatološke i citološke nalaze na hrvatskom jeziku. Tvoj zadatak je iz zadane liste ključnih riječi (lematizirani medicinski pojmovi izvučeni iz originalnog nalaza) rekonstruirati:
    1) "opis" — strukturirani makroskopski/mikroskopski opis nalaza,
    2) "dg"   — kratku, konkretnu dijagnozu u jednoj rečenici.

PRAVILA STILA (obavezno):
- Opis počinje frazom tipa: "Dostavljen je uzorak …", "Dostavljeni su razmasci …", "Dostavljeno tkivo čini …".
- Koristi standardnu veterinarsko-patološku terminologiju (anizokarioza, mitoze, infiltrativan rast, nekroza, neutrofilni/limfocitni infiltrat, hiperplazija, metaplazija, pleomorfizam, itd.).
- Spominji tip tkiva/organa ako ga keywords impliciraju (npr. "subkutis" → potkožje, "mliječna" → mliječna žlijezda, "limf" → limfni čvor).
- Opis 4-10 rečenica; dijagnoza JEDNA rečenica, bez objašnjenja, završava točkom.
- "dg" mora biti dijagnostički naziv (npr. "Tubulopapilarni karcinom mliječne žlijezde, stupanj malignosti II."), NE popis keywordsa.

PRAVILA TOČNOSTI:
- Koristi isključivo informacije podržane keywordsima ili uobičajen klinički kontekst za navedene pojmove. NE izmišljaj konkretne brojeve (postotke, dimenzije, mitotski indeks) osim ako keyword direktno ne sugerira.
- Ako keywords sugeriraju upalu (neutrofil, limfocit, makrofag, piogranulomatozni) — opiši upalni infiltrat i izvedi upalnu Dg.
- Ako keywords sugeriraju tumor (karcinom, sarkom, adenom, mastocitom, pleomorfizam, mitoze, infiltrativno) — opiši neoplastične karakteristike i izvedi tumorsku Dg.
- Ako su keywords pretanki za sigurnu dijagnozu — formuliraj "dg" kao najvjerojatniji entitet ili opisni nalaz (npr. "Reaktivna hiperplazija limfnog čvora.", "Dilatirana apokrina žlijezda.").
- TERMINOLOGIJA: kad postoji ustaljen latinski/internacionalni naziv koji se rutinski koristi u veterinarskoj patologiji, preferiraj ga (npr. "Seminoma testis", "Fibrosarcoma subcutis", "Mastocytoma"). Za upalne i opisne dijagnoze koristi hrvatski.

OUTPUT:
Vrati ISKLJUČIVO valjan JSON, bez markdown blokova, točno u ovom obliku:
{"opis": "...", "dg": "..."}
"""


class Orchestrator:
    def __init__(self, local_path: Optional[Path] = None):
        self.local_path = local_path or DEFAULT_BAZA
        self.retriever: HybridRetriever = build_hybrid(self.local_path)
        self.bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

    def query(self, keywords: list[str], k: int = 1) -> dict:
        """
        Vrati dijagnozu i opis za zadane ključne riječi.

        Returns:
            {
                "dg":     str,
                "opis":   str,
                "source": "router" | "sonnet",
                "match":  dict | None
            }
        """
        query_text = ", ".join(kw.strip() for kw in keywords if kw.strip())
        results = self.retriever.query(query_text, k=k)

        if results:
            best = results[0]
            return {"dg": best["dg"], "opis": best["opis"], "source": "router", "match": best}

        print("[orchestrator] Router nije pronašao podudaranje — pozivam Sonnet...")
        dg, opis = self._call_sonnet(keywords)

        new_entry = self._write_back(keywords, dg, opis)
        self.retriever.add_entry(new_entry)
        print(f"[orchestrator] Novi unos zapisan u bazu: id={new_entry['id']}")

        return {"dg": dg, "opis": opis, "source": "sonnet", "match": None}

    def _call_sonnet(self, keywords: list[str]) -> tuple[str, str]:
        kw_str = ", ".join(kw.strip() for kw in keywords if kw.strip())
        prompt_text = f'Keywords: {kw_str}\n\nGeneriraj {{"opis": "...", "dg": "..."}}.'

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "system": [
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            "messages": [{"role": "user", "content": prompt_text}],
        })

        resp = self.bedrock.invoke_model(
            modelId=SONNET_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        text = json.loads(resp["body"].read())["content"][0]["text"].strip()
        parsed = json.loads(text)
        return parsed["dg"], parsed["opis"]

    def _write_back(self, keywords: list[str], dg: str, opis: str) -> dict:
        new_entry = {
            "id": f"gen_{uuid.uuid4().hex[:8]}",
            "keywords": ", ".join(kw.strip() for kw in keywords if kw.strip()),
            "dg": dg,
            "opis": opis,
        }

        if S3_BUCKET:
            self._write_back_s3(new_entry)
        else:
            self._write_back_local(new_entry)

        return new_entry

    def _write_back_s3(self, new_entry: dict) -> None:
        s3 = boto3.client("s3")
        obj = s3.get_object(Bucket=S3_BUCKET, Key=S3_KEY)
        entries = json.loads(obj["Body"].read().decode("utf-8"))
        entries.append(new_entry)
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=S3_KEY,
            Body=json.dumps(entries, ensure_ascii=False, indent=2).encode("utf-8"),
            ContentType="application/json",
        )
        print(f"[orchestrator] Zapisano u S3: s3://{S3_BUCKET}/{S3_KEY}")

    def _write_back_local(self, new_entry: dict) -> None:
        # Lambda filesystem je read-only — pišemo u /tmp koji preživljava warm startove
        tmp_path = Path("/tmp/baza_writeback.json")
        if tmp_path.exists():
            with tmp_path.open(encoding="utf-8") as f:
                entries = json.load(f)
        else:
            with self.local_path.open(encoding="utf-8") as f:
                entries = json.load(f)
        entries.append(new_entry)
        with tmp_path.open("w", encoding="utf-8") as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        print(f"[orchestrator] Zapisano u /tmp: {len(entries)} unosa")


# ---------- Lambda globalni cache ----------

_orchestrator: Optional[Orchestrator] = None


def _get_orchestrator() -> Orchestrator:
    """Vrati cached Orchestrator — inicijalizira se samo na cold startu."""
    global _orchestrator
    if _orchestrator is None:
        # Za Lambda: retriever se gradi iz S3 via get_retriever()
        # Za CLI: pad-through na lokalnu bazu
        if S3_BUCKET:
            orch = object.__new__(Orchestrator)
            orch.local_path = DEFAULT_BAZA
            orch.retriever = get_retriever()
            orch.bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)
            _orchestrator = orch
        else:
            _orchestrator = Orchestrator()
    return _orchestrator


# ---------- Lambda entry point ----------

def lambda_handler(event, context):
    """
    AWS Lambda entry point — kompatibilan s postojećim AppSync/Amplify setupom.

    Ulaz (AppSync mutation):  event.arguments.keywords = ["kw1", "kw2", ...]
    Izlaz: JSON string {"opis": "...", "dg": "...", "source": "router"|"sonnet", "v": "2"}
    """
    keywords: list[str] = []
    if "arguments" in event:
        keywords = event["arguments"].get("keywords") or []
    elif "body" in event:
        body = event["body"]
        if isinstance(body, str):
            body = json.loads(body)
        keywords = body.get("keywords") or []
    else:
        keywords = event.get("keywords") or []

    result = _get_orchestrator().query(keywords)

    return json.dumps(
        {"opis": result["opis"], "dg": result["dg"], "source": result["source"], "v": "2"},
        ensure_ascii=False,
    )
