"""Minimal FastAPI app stub — bind loopback only when serving."""

from fastapi import FastAPI

app = FastAPI(title="ATO ops-api", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
