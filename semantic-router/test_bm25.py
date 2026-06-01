"""
Lokalni test BM25 retrievera bez AWS poziva.
Pokazuje radi li router (cache hit) za zadane ključne riječi.
"""
from hybrid_router import BM25, tokenize, _load_entries, _doc_text

entries = _load_entries()
docs_tokens = [tokenize(_doc_text(e)) for e in entries]
bm25 = BM25(docs_tokens)

test_queries = [
    "limfocit, makrofag, neutrofil",
    "subkutis, infiltrativno, karcinom",
    "epitel, makrofag, piogranulomatozni",
    "metaplazija, pleomorfizam, limfocit",
]

print(f"Baza: {len(entries)} unosa\n")

for query in test_queries:
    toks = tokenize(query)
    scores = bm25.scores(toks)
    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:3]

    print(f"Upit: {query}")
    for rank, (idx, score) in enumerate(ranked, 1):
        if score <= 0:
            break
        e = entries[idx]
        dg = (e.get("dg") or "—").strip()[:80]
        print(f"  #{rank} score={score:.2f} | id={e['id']} | dg={dg}")
    print()
