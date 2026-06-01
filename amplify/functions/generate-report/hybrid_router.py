"""
Hibridni retriever: BM25 pronalazi kandidate, Claude Haiku (Bedrock) ih rerankirá.

Podržava učitavanje baze iz lokalnog fajla (CLI) ili S3 (Lambda).
Konfiguracija via env varijable:
  BAZA_S3_BUCKET  — S3 bucket za bazu (ako nije postavljen, koristi lokalni fajl)
  BAZA_S3_KEY     — S3 ključ (default: semantic-router/baza.json)
  BEDROCK_REGION  — region za Bedrock pozive (default: us-east-1)

API:
  build_hybrid()  -> HybridRetriever   (koristi env var konfiguraciju)
  retriever.query(text, k=5) -> [{id, opis, dg, keywords, score, haiku_rank, bm25_rank}]
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Optional

import boto3

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


DEFAULT_BAZA = Path(__file__).parent / "baza.json"

# Bedrock cross-region inference — Lambda je u eu-north-1, Bedrock u us-east-1
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
HAIKU_MODEL_ID = os.environ.get("ROUTER_MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")

# S3 konfiguracija — postavlja se u Lambda env varijablama
S3_BUCKET = os.environ.get("BAZA_S3_BUCKET")
S3_KEY = os.environ.get("BAZA_S3_KEY", "semantic-router/baza.json")

COMPONENT_TOP_K = 30

_STOPWORDS = {
    "a", "e", "i", "o", "u", "s", "z", "k", "n",
    "je", "se", "na", "su", "da", "za", "od", "do", "iz", "ili", "ali",
    "pa", "ni", "ne", "li", "što", "koji", "koja", "koje", "kao", "te",
    "sa", "po", "pri", "bez", "nad", "pod", "uz", "kroz", "prema",
    "između", "zbog", "osim", "oko", "nakon", "prije", "svi", "sve",
    "svaki", "svaka", "neka", "neki", "neke", "više", "manje", "može",
    "mogu", "biti", "ima", "imaju", "ovaj", "ova", "ovo", "taj", "ta",
    "to", "tog", "ovog", "ovim", "tim", "ovih", "tih", "ih", "im",
    "mu", "ga", "ju", "mi", "ti", "vi", "oni", "one", "ona",
    "sam", "si", "smo", "ste", "nisu", "nije", "bio", "bila", "bilo",
    "već", "još", "samo", "kada", "gdje", "kako", "zašto",
}


def tokenize(text: str) -> list[str]:
    text = re.sub(r"dg\..*", "", text, flags=re.IGNORECASE)
    tokens = re.findall(r"[A-Za-zčćžšđČĆŽŠĐ]+", text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 2]


# ---------- BM25 ----------

def _doc_text(entry: dict) -> str:
    parts: list[str] = []
    for field in ("keywords", "keywords_original", "dg"):
        val = (entry.get(field) or "").strip()
        if val:
            parts.append(val)
    return " ".join(parts)


class BM25:
    def __init__(self, docs_tokens: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.docs = docs_tokens
        self.N = len(docs_tokens)
        self.doc_lens = [len(d) for d in docs_tokens]
        self.avgdl = sum(self.doc_lens) / max(self.N, 1)

        df: Counter[str] = Counter()
        for tokens in docs_tokens:
            for t in set(tokens):
                df[t] += 1

        self.idf = {
            t: math.log((self.N - n + 0.5) / (n + 0.5) + 1.0) for t, n in df.items()
        }
        self.tf = [Counter(d) for d in docs_tokens]

    def scores(self, query_tokens: list[str]) -> list[float]:
        scores = [0.0] * self.N
        for q in query_tokens:
            idf = self.idf.get(q)
            if idf is None or idf <= 0:
                continue
            for i in range(self.N):
                f = self.tf[i].get(q, 0)
                if f == 0:
                    continue
                dl = self.doc_lens[i]
                denom = f + self.k1 * (1.0 - self.b + self.b * dl / self.avgdl)
                scores[i] += idf * (f * (self.k1 + 1.0)) / denom
        return scores


# ---------- Haiku reranker ----------

class HaikuReranker:
    def __init__(self):
        self.bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

    def rerank(self, query: str, candidates: list[dict], k: int) -> list[str]:
        if not candidates:
            return []

        lines = []
        for i, c in enumerate(candidates, 1):
            dg = (c.get("dg") or "").strip()
            kw = (c.get("keywords") or "").strip()[:120]
            lines.append(f"[{i}] ID={c['id']} | Dg: {dg} | Keywords: {kw}")

        prompt = (
            f'Upit: "{query}"\n\n'
            "Sortiraj sljedeće veterinarskopatološke nalaze po relevantnosti za zadani upit. "
            f"Vrati SAMO JSON listu ID-ova (string vrijednosti), npr. [\"id1\", \"id2\"], "
            f"top {k} najrelevantnijih. "
            "Ako NIJEDAN kandidat nije medicinsko relevantno podudaranje za upit, vrati praznu listu []. "
            "Bez objašnjenja.\n\n"
            + "\n".join(lines)
        )

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 256,
            "messages": [{"role": "user", "content": prompt}],
        })

        resp = self.bedrock.invoke_model(
            modelId=HAIKU_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        text = json.loads(resp["body"].read())["content"][0]["text"].strip()

        match = re.search(r"\[.*?\]", text, re.DOTALL)
        if match:
            try:
                ids = json.loads(match.group())
                valid = {c["id"] for c in candidates}
                return [str(i) for i in ids if str(i) in valid][:k]
            except (json.JSONDecodeError, TypeError):
                pass

        return []


# ---------- Učitavanje baze ----------

def _load_entries(
    local_path: Optional[Path] = None,
    s3_bucket: Optional[str] = None,
    s3_key: Optional[str] = None,
) -> list[dict]:
    """Učitaj unose iz S3 (Lambda) ili lokalnog fajla (CLI).
    Na prvom pokretanju (S3 prazan), bootstrapira S3 iz bundlanog baza.json.
    """
    bucket = s3_bucket or S3_BUCKET
    if bucket:
        key = s3_key or S3_KEY
        s3 = boto3.client("s3")
        try:
            print(f"Učitavam bazu iz S3: s3://{bucket}/{key}")
            obj = s3.get_object(Bucket=bucket, Key=key)
            return json.loads(obj["Body"].read().decode("utf-8"))
        except s3.exceptions.NoSuchKey:
            print("S3 baza ne postoji — bootstrapiram iz bundlanog fajla...")
            path = local_path or DEFAULT_BAZA
            with Path(path).open(encoding="utf-8") as f:
                entries = json.load(f)
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=json.dumps(entries, ensure_ascii=False, indent=2).encode("utf-8"),
                ContentType="application/json",
            )
            print(f"Bootstrap gotov: {len(entries)} unosa uploadano na s3://{bucket}/{key}")
            return entries

    # Provjeri /tmp write-back (warm Lambda s novim unosima)
    tmp_path = Path("/tmp/baza_writeback.json")
    if tmp_path.exists():
        print(f"Učitavam bazu iz /tmp (warm start s write-backom)")
        with tmp_path.open(encoding="utf-8") as f:
            return json.load(f)

    path = local_path or DEFAULT_BAZA
    print(f"Učitavam bazu iz bundlanog fajla: {path}")
    with Path(path).open(encoding="utf-8") as f:
        return json.load(f)


# ---------- HybridRetriever ----------

class HybridRetriever:
    def __init__(self, entries: list[dict]):
        self.entries = entries
        self.id_to_entry: dict[str, dict] = {e["id"]: e for e in entries}

        print("Gradim BM25 komponentu...")
        self.docs_tokens = [tokenize(_doc_text(e)) for e in entries]
        self.bm25 = BM25(self.docs_tokens)

        print("Inicijaliziram Haiku reranker...")
        self.reranker = HaikuReranker()

    def add_entry(self, entry: dict) -> None:
        """Dodaj novi unos u in-memory retriever (bez ponovnog čitanja diska/S3)."""
        self.entries.append(entry)
        self.id_to_entry[entry["id"]] = entry
        self.docs_tokens.append(tokenize(_doc_text(entry)))
        self.bm25 = BM25(self.docs_tokens)

    def query(self, text: str, k: int = 5) -> list[dict]:
        toks = tokenize(text)
        bm25_scores = self.bm25.scores(toks)
        ranked_idx = sorted(enumerate(bm25_scores), key=lambda x: x[1], reverse=True)[:COMPONENT_TOP_K]

        candidates = []
        for bm25_rank, (idx, score) in enumerate(ranked_idx, 1):
            if score <= 0:
                break
            candidates.append({
                **self.entries[idx],
                "bm25_rank": bm25_rank,
                "bm25_score": score,
            })

        if not candidates:
            return []

        ranked_ids = self.reranker.rerank(text, candidates, k=k)

        bm25_by_id = {c["id"]: c for c in candidates}
        out: list[dict] = []
        for haiku_rank, eid in enumerate(ranked_ids, 1):
            entry = self.id_to_entry.get(eid)
            if entry is None:
                continue
            bm = bm25_by_id.get(eid, {})
            out.append({
                "id": eid,
                "opis": entry.get("opis"),
                "dg": entry.get("dg"),
                "keywords": entry.get("keywords"),
                "score": 1.0 / haiku_rank,
                "haiku_rank": haiku_rank,
                "bm25_rank": bm.get("bm25_rank"),
                "bm25_score": bm.get("bm25_score"),
            })
        return out


# ---------- Globalni cache za Lambda warm starts ----------

_retriever: Optional[HybridRetriever] = None


def get_retriever() -> HybridRetriever:
    """Vrati cached retriever (gradi samo na cold startu)."""
    global _retriever
    if _retriever is None:
        entries = _load_entries()
        _retriever = HybridRetriever(entries)
    return _retriever


def build_hybrid(local_path: Optional[Path] = None) -> HybridRetriever:
    """Izgradi novi retriever — za CLI korištenje ili testove."""
    entries = _load_entries(local_path=local_path)
    return HybridRetriever(entries)
