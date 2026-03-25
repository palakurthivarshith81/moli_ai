import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")

# ================= MODELS =================

FREE_MODELS = [
    "stepfun/step-3.5-flash:free",
    #"google/gemma-3n-e4b-it:free"   #  fallback model (important)
]

PREMIUM_MODELS = [
    "openai/gpt-4o-mini"
]

# ================= SYSTEM PROMPT =================

SYSTEM_PROMPT = """
You are a molecular visualization AI.

You MUST return ONLY valid JSON.

Format:
{
  "text": "short explanation",
  "actions": [
    { "type": "load_structure", "pdb_id": "4HHB" },
    { "type": "zoom" },
    { "type": "show_surface" },
    { "type": "highlight", "selection": "ligand" },
    { "type": "color_protein", "color": "red" }
  ]
}

Rules:
- ONLY return JSON
- NO markdown
- NO explanation outside JSON
- actions must be valid

Allowed actions:
- load_structure
- zoom
- show_surface
- highlight
- color_protein

If no action → return "actions": []
"""

# ================= JSON CLEANER =================

def extract_json(text: str):
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == -1:
            return None
        return text[start:end]
    except:
        return None


# ================= MAIN =================

async def call_llm(prompt, mode="free"):

    models = FREE_MODELS if mode == "free" else PREMIUM_MODELS
    last_error = None

    for model in models:

        try:
            print(f"\nTrying ({mode}): {model}")

            res = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Molecular AI"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 400
                },
                timeout=20
            )

            print("STATUS:", res.status_code)

            if res.status_code != 200:
                print("FAILED:", res.text)
                last_error = res.text
                continue

            data = res.json()

            # ================= SAFE PARSING =================

            choices = data.get("choices")

            if not choices or len(choices) == 0:
                raise ValueError("No choices returned")

            message = choices[0].get("message")

            if not message:
                raise ValueError("Message missing")

            raw_text = message.get("content")

            if not raw_text:
                raise ValueError("Content missing")

            print("RAW:", raw_text[:150])

            # ================= JSON EXTRACTION =================

            json_text = extract_json(raw_text)

            if not json_text:
                raise ValueError("JSON extraction failed")

            print("SUCCESS:", model)

            return {
                "text": json_text.strip(),
                "model": model
            }

        except Exception as e:
            print(f"ERROR ({model}):", str(e))
            last_error = str(e)
            continue

    # ================= FALLBACK =================

    print("\n All models failed. Using fallback.")

    fallback_json = """
    {
      "text": "Loaded structure. You can explore surface, ligand, or coloring.",
      "actions": []
    }
    """

    return {
        "text": fallback_json.strip(),
        "error": "LLM_FAILED",
        "details": last_error
    }