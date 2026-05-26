# Semantic Router za histopatološke nalaze

Semantički router nad bazom od 249 histopatoloških nalaza (hrvatski jezik) koji
za zadani upit (ključne riječi ili kratak opis slučaja) dohvaća odgovarajući
opis i dijagnozu iz baze. Projekt iterativno poboljšava točnost dohvata kroz
četiri verzije — od baseline semantičkog routera do hibridnog
semantika + BM25 retrievera spojenog Reciprocal Rank Fusionom.

> Implementacija koristi [`aurelio-labs/semantic-router`](https://github.com/aurelio-labs/semantic-router)
> i multilingvalni mpnet encoder
> (`sentence-transformers/paraphrase-multilingual-mpnet-base-v2`).

## Rezultati (n=248)

| Metrika        |   v1 |   v2 |   v3 |   v4 |
|----------------|-----:|-----:|-----:|-----:|
| strict top-1   | 5.2% |10.5% |12.9% |**34.7%** |
| strict top-3   |10.5% |23.0% |29.4% |**57.3%** |
| strict top-5   |14.1% |29.0% |36.7% |**66.9%** |
| strict top-10  |22.2% |42.7% |49.2% |**83.1%** |
| loose top-1    | 6.9% |13.7% |15.7% |**39.5%** |
| loose top-10   |23.0% |47.2% |52.0% |**85.5%** |

> *strict* = točan `id` u top-K · *loose* = ista dijagnoza (`dg`) u top-K

![Usporedba verzija](results/eval_comparison.png)

Detaljan opis metodologije i analize: [docs/izvjestaj.pdf](docs/izvjestaj.pdf).

## Verzije

| Verzija | Pristup                                | Skripta                     | Podaci         |
|---------|----------------------------------------|-----------------------------|----------------|
| **v1**  | Baseline (ručni keywordi)              | `router.py`                 | `baza.json`    |
| **v2**  | TF-IDF obogaćivanje keyworda           | `extract_keywords.py`       | `baza_v2.json` |
| **v3**  | KeyBERT-style semantičko rangiranje    | `extract_keywords_v3.py`    | `baza_v3.json` |
| **v4**  | Hibrid: semantika + BM25 + RRF         | `hybrid_router.py`          | `baza_v3.json` |

## Brzi start

```bash
# 1) Postavi okolinu
python -m venv .venv
source .venv/bin/activate            # Linux/macOS
# .venv\Scripts\Activate.ps1         # Windows PowerShell

pip install -r requirements.txt

# 2) Pokreni baseline router s ugrađenim primjerima upita
python router.py

# 3) Ili pokreni hibridni v4 retriever (najtočniji)
python hybrid_router.py

# 4) Vlastiti upit
python router.py "histiocitni sarkom slezene"
```

## Programatski API

```python
from hybrid_router import build_hybrid

retriever = build_hybrid("baza_v3.json")
top = retriever.query("limfociti, makrofagi, neutrofili u limfnom čvoru", k=5)
for r in top:
    print(r["score"], r["id"], r["dg"])
```

## Reproduciranje evaluacije

```bash
# v1
python evaluate.py baza.json

# v2 / v3
python evaluate.py baza_v2.json
python evaluate.py baza_v3.json

# v4 (hibrid)
python evaluate_hybrid.py baza_v3.json

# Usporedna slika
python compare_evals.py
```

Izlazi (`eval_results_*.json`, `*.png`) idu u trenutni direktorij; primjeri su
spremljeni u [results/](results/).

## Generiranje keyworda

```bash
# baza.json -> baza_v2.json (TF-IDF)
python extract_keywords.py

# baza.json -> baza_v3.json (KeyBERT-style)
python extract_keywords_v3.py

# baza_v3.json -> baza_v4.json (dodaje disjoint utterance-e iz opisa)
python extract_keywords_v4.py
```


