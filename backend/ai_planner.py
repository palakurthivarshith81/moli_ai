from google import genai
from pydantic import TypeAdapter, BaseModel
from pdb_service import fetch_pdb_info
from utils import extract_pdb_id
from typing import List, Optional, Literal, Union
import json

client = genai.Client()

# =========================================================
# Action Models
# =========================================================

class VisualizationAction(BaseModel):
    type: Literal[
        "load_structure",
        "highlight",
        "measure_angle",
        "show_surface",
        "zoom"
    ]
    pdb_id: Optional[str] = None
    selection: Optional[str] = None
    atoms: Optional[List[str]] = None


class VisualizationPlan(BaseModel):
    mode: Literal["visualization"]
    text: str
    pdb_id: str
    actions: List[VisualizationAction]


class InformationPlan(BaseModel):
    mode: Literal["information"]
    text: str


Plan = Union[VisualizationPlan, InformationPlan]


# =========================================================
# System Prompt (Gemini Structured Mode)
# =========================================================

SYSTEM_PROMPT = """
You are a molecular AI assistant.

If the user asks for visualization or structure manipulation,
return:

{
  "mode": "visualization",
  "text": "... explanation ...",
  "pdb_id": "...",
  "actions": [...]
}

If the user asks for explanation, background, or description,
return:

{
  "mode": "information",
  "text": "... detailed explanation ..."
}

Rules:
- Return ONLY valid JSON
- Never use markdown
- Never invent unsupported action types
- Never return empty fields
- Allowed action types:
  load_structure
  highlight
  measure_angle
  show_surface
  zoom
"""


# =========================================================
# Main Plan Generator (Hybrid Logic)
# =========================================================

async def generate_plan(user_prompt: str):

    lower = user_prompt.lower()
    pdb_id = extract_pdb_id(user_prompt)

    # =====================================================
    # 1️⃣ Deterministic Visualization Mode
    #    (Fast, reliable, PlayMolecule-like)
    # =====================================================
    if pdb_id and any(word in lower for word in ["show", "load", "visualize", "surface"]):

        info = fetch_pdb_info(pdb_id)

        if not info:
            return {
                "mode": "information",
                "text": f"No data found for PDB ID {pdb_id}"
            }

        actions = []

        # Always load structure
        actions.append({
            "type": "load_structure",
            "pdb_id": pdb_id
        })

        # Always zoom
        actions.append({
            "type": "zoom"
        })

        # Highlight first ligand automatically
        ligands = info.get("ligands", [])
        if ligands and ligands[0] != "None":
            ligand_code = ligands[0]
            actions.append({
                "type": "highlight",
                "selection": f"resname {ligand_code}"
            })

        # Surface if requested
        if "surface" in lower:
            actions.append({
                "type": "show_surface"
            })

        return {
            "mode": "visualization",
            "text": (
                f"Loaded {info['pdb_id']} — {info['title']}.\n\n"
                f"Ligands detected: {', '.join(ligands) if ligands else 'None'}.\n"
                f"Structure ready for visualization."
            ),
            "pdb_id": pdb_id,
            "actions": actions
        }

    # =====================================================
    # 2️⃣ Grounded Explanation Mode
    # =====================================================
    if pdb_id and "explain" in lower:

        info = fetch_pdb_info(pdb_id)

        if not info:
            return {
                "mode": "information",
                "text": f"No data found for PDB ID {pdb_id}"
            }

        return {
            "mode": "information",
            "text": (
                f"{info['pdb_id']} — {info['title']}\n\n"
                f"Experimental Method: {info['experimental_method']}\n"
                f"Resolution: {info['resolution']}\n"
                f"Organism: {info['organism']}\n"
                f"Polymer Entities: {info.get('polymer_entity_count')}\n"
                f"Molecular Weight: {info.get('molecular_weight')}\n"
                f"Ligands: {', '.join(info.get('ligands', [])) or 'None'}\n"
                f"Deposited On: {info['deposition_date']}"
            )
        }

    # =====================================================
    # 3️⃣ Gemini Structured AI Mode (Complex reasoning)
    # =====================================================
    try:
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=SYSTEM_PROMPT + "\n\nUser request:\n" + user_prompt,
            config={"response_mime_type": "application/json"}
        )

        parsed = json.loads(response.text)

        adapter = TypeAdapter(Plan)
        validated = adapter.validate_python(parsed)

        return validated.model_dump()

    except Exception as e:
        return {
            "mode": "information",
            "text": f"AI planning failed: {str(e)}"
        }