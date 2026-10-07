"""LLM connection settings for the ATOOL agent.

Everything is OpenAI-compatible `/chat/completions`, so the same code routes
to any of these by setting three environment variables when launching the API:

    Groq    LLM_BASE_URL=https://api.groq.com/openai/v1
            LLM_API_KEY=gsk_...            LLM_MODEL=llama-3.3-70b-versatile

    Gemini  LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
            LLM_API_KEY=AIza...            LLM_MODEL=gemini-2.0-flash

    Ollama  LLM_BASE_URL=http://localhost:11434/v1
            LLM_API_KEY=ollama             LLM_MODEL=llama3.1

Defaults target Groq's free tier. With no LLM_API_KEY set, /api/chat falls
back to the built-in rule-based assistant so the campus demo keeps working.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# backend/.env (optional) supplies the LLM_* values without shell env vars,
# keeping the API key out of source control. Real env vars still win.
load_dotenv(Path(__file__).resolve().parent / ".env")


class LLMSettings:
    def __init__(self) -> None:
        self.base_url = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.3"))
        self.timeout_seconds = float(os.getenv("LLM_TIMEOUT", "45"))

    @property
    def configured(self) -> bool:
        return bool(self.api_key)


settings = LLMSettings()

