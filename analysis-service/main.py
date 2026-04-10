# ─── FastAPI entry point ──────────────────────────────────────────────────────
# Exposes a single endpoint that the Express backend proxies to.
#
# POST /analyze
#   Body: { "complaints": ["string", ...] }
#   Returns: { "report": "string" }
#
# Start:  uvicorn main:app --reload --port 8000

import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from crew import run_analysis  # noqa: E402 — import after env is loaded

app = FastAPI(title="Complain Jar Analysis Service")

# Allow requests from the Express backend only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    complaints: list[str]


class AnalyzeResponse(BaseModel):
    report: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest):
    if not body.complaints:
        raise HTTPException(status_code=400, detail="complaints list is empty")
    if len(body.complaints) > 200:
        raise HTTPException(status_code=400, detail="too many complaints (max 200)")

    try:
        report = run_analysis(body.complaints)
        return AnalyzeResponse(report=report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
