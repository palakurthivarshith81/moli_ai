from google import genai
from pydantic import TypeAdapter, BaseModel
from pdb_service import fetch_pdb_info
from utils import extract_pdb_id
from typing import List, Optional, Literal, Union
import json
import re

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
        "zoom",
        "color_protein",
        "color_ligand"
    ]
    pdb_id: Optional[str] = None
    selection: Optional[str] = None
    atoms: Optional[List[str]] = None
    color: Optional[str] = None


class VisualizationPlan(BaseModel):
    mode: Literal["visualization"]
    text: str
    pdb_id: Optional[str] = None
    actions: List[VisualizationAction]


class InformationPlan(BaseModel):
    mode: Literal["information"]
    text: str


Plan = Union[VisualizationPlan, InformationPlan]


# =========================================================
# Safety Normalizer
# =========================================================

def normalize_actions(plan):

    if "actions" not in plan:
        return plan

    fixed = []

    for action in plan["actions"]:

        if isinstance(action, str):
            fixed.append({"type": action})

        elif isinstance(action, dict) and "type" not in action:
            continue

        else:
            fixed.append(action)

    plan["actions"] = fixed
    return plan


# =========================================================
# Gemini System Prompt
# =========================================================

SYSTEM_PROMPT = """
You are a molecular AI assistant.

If the user asks for visualization or structure manipulation,
return JSON like this:

{
  "mode": "visualization",
  "text": "short explanation",
  "pdb_id": "1ABC",
  "actions": [
    {"type": "load_structure", "pdb_id": "1ABC"},
    {"type": "zoom"}
  ]
}

Rules:
- Return ONLY valid JSON
- Never use markdown
- Never return actions as strings
- Allowed action types:

load_structure
highlight
show_surface
zoom
color_protein
color_ligand
"""


# =========================================================
# Helper: detect color commands
# =========================================================

def detect_color_command(text):

    protein_match = re.search(r"color protein (\w+)", text)
    ligand_match = re.search(r"color ligand (\w+)", text)

    actions = []

    if protein_match:
        actions.append({
            "type": "color_protein",
            "color": protein_match.group(1)
        })

    if ligand_match:
        actions.append({
            "type": "color_ligand",
            "color": ligand_match.group(1)
        })

    return actions


# =========================================================
# Main Plan Generator
# =========================================================

async def generate_plan(user_prompt: str):

    lower = user_prompt.lower()
    pdb_id = extract_pdb_id(user_prompt)

    # =====================================================
    # Color commands
    # =====================================================

    color_actions = detect_color_command(lower)

    if color_actions:

        return {
            "mode": "visualization",
            "text": "Updating molecular colors",
            "actions": color_actions
        }


    # =====================================================
    # Show / Load structure
    # =====================================================

    if pdb_id and any(word in lower for word in ["show", "load", "visualize"]):

        info = fetch_pdb_info(pdb_id)

        if not info:
            return {
                "mode": "information",
                "text": f"No data found for PDB ID {pdb_id}"
            }

        actions = [
            {"type": "load_structure", "pdb_id": pdb_id},
            {"type": "zoom"}
        ]

        ligands = info.get("ligands", [])

        if ligands and ligands[0] != "None":
            ligand_code = ligands[0]

            actions.append({
                "type": "highlight",
                "selection": f"resname {ligand_code}"
            })

        if "surface" in lower:
            actions.append({"type": "show_surface"})

        return {
            "mode": "visualization",
            "text": (
                f"Loaded {info['pdb_id']} — {info['title']}.\n\n"
                f"Ligands detected: {', '.join(ligands)}.\n"
                f"Structure ready for visualization."
            ),
            "pdb_id": pdb_id,
            "actions": actions
        }


    # =====================================================
    # Highlight command
    # =====================================================

    if "highlight" in lower:

        words = lower.split()

        if len(words) >= 2:

            ligand = words[-1].upper()

            return {
                "mode": "visualization",
                "text": f"Highlighting ligand {ligand}",
                "actions": [
                    {
                        "type": "highlight",
                        "selection": f"resname {ligand}"
                    }
                ]
            }


    # =====================================================
    # Surface command
    # =====================================================

    if "surface" in lower:

        return {
            "mode": "visualization",
            "text": "Displaying molecular surface",
            "actions": [
                {"type": "show_surface"}
            ]
        }


    # =====================================================
    # Zoom command
    # =====================================================

    if "zoom" in lower:

        return {
            "mode": "visualization",
            "text": "Resetting camera view",
            "actions": [
                {"type": "zoom"}
            ]
        }


    # =====================================================
    # Gemini fallback
    # =====================================================

    try:

        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=SYSTEM_PROMPT + "\n\nUser request:\n" + user_prompt,
            config={"response_mime_type": "application/json"}
        )

        parsed = json.loads(response.text)

        parsed = normalize_actions(parsed)

        adapter = TypeAdapter(Plan)
        validated = adapter.validate_python(parsed)

        return validated.model_dump()

    except Exception as e:

        return {
            "mode": "information",
            "text": f"AI planning failed: {str(e)}"
        }