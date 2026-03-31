import asyncio
import json
from typing import List, Optional, Literal, Union

from pydantic import BaseModel
from pdb_service import fetch_pdb_info
from utils import extract_pdb_id
from llm_router import call_llm


# ================= MODELS =================

class VisualizationAction(BaseModel):
    type: Literal[
        "load_structure",
        "highlight",
        "measure_angle",
        "show_surface",
        "zoom",
        "color_protein",
        "color_ligand",
        "publication_view",
        "focus_compound",
        "label_residues",
        "show_interactions"
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


# ================= VALIDATION =================

VALID_ACTIONS = {
    "load_structure",
    "zoom",
    "show_surface",
    "highlight",
    "color_protein",
    "color_ligand",
    "publication_view",
    "focus_compound",
    "label_residues",
    "show_interactions"
}


def validate_actions(actions):
    safe = []

    for a in actions:
        if isinstance(a, dict) and a.get("type") in VALID_ACTIONS:
            safe.append(a)

    return safe


# ================= MAIN =================

async def generate_plan(user_prompt: str, mode="free"):

    pdb_id = extract_pdb_id(user_prompt)
    lower = user_prompt.lower()

    # ================= PUBLICATION VIEW =================

    if pdb_id and ("publication" in lower or "publication view" in lower):

        return {
            "mode": "visualization",
            "text": f"Showing publication-ready view for {pdb_id}",
            "actions": [
                {"type": "load_structure", "pdb_id": pdb_id},
                {"type": "zoom"},
                {"type": "publication_view"},
                {"type": "label_residues"}
            ]
        }

    # ================= INTERACTION VIEW =================

    if pdb_id and (
        "interaction" in lower
        or "binding residue" in lower
        or "binding site" in lower
        or "show interactions" in lower
    ):

        return {
            "mode": "visualization",
            "text": f"Showing ligand binding interactions for {pdb_id}",
            "actions": [
                {"type": "load_structure", "pdb_id": pdb_id},
                {"type": "zoom"},
                {"type": "show_interactions"}
            ]
        }

    # ================= LLM =================

    response = await call_llm(user_prompt, mode)
    raw_text = response.get("text", "{}")

    try:

        data = json.loads(raw_text)
        text = data.get("text", "")
        actions = data.get("actions", [])

    except Exception as e:

        print("JSON PARSE ERROR:", e)

        return {
            "mode": "information",
            "text": "AI response parsing failed. Try again."
        }

    # ================= VALIDATE =================

    actions = validate_actions(actions)

    # ================= FORCE ACTIONS =================

    if pdb_id:

        if not any(a.get("type") == "load_structure" for a in actions):
            actions.insert(0, {"type": "load_structure", "pdb_id": pdb_id})
            actions.insert(1, {"type": "zoom"})

        # Surface

        if "surface" in lower and not any(a.get("type") == "show_surface" for a in actions):
            actions.append({"type": "show_surface"})

        # Ligand

        if "ligand" in lower or "compound" in lower:

            if "zoom" in lower or "focus" in lower:
                actions.append({"type": "focus_compound"})

            elif not any(a.get("type") == "highlight" for a in actions):
                actions.append({"type": "highlight", "selection": "ligand"})

        # Focus compound

        if ("compound" in lower or "focus" in lower) and pdb_id:
            actions.append({"type": "focus_compound"})

        # Protein coloring

        if "color" in lower and not any(a.get("type") == "color_protein" for a in actions):

            color = "cyan"

            if "red" in lower:
                color = "red"

            elif "blue" in lower:
                color = "blue"

            actions.append({"type": "color_protein", "color": color})

    # ================= DEBUG =================

    print("FINAL ACTIONS:", actions)

    # ================= PDB INFO =================

    pdb_info = fetch_pdb_info(pdb_id) if pdb_id else None

    if pdb_info:

        text += f"\n\n--- STRUCTURE DATA ---"
        text += f"\nTitle: {pdb_info['title']}"
        text += f"\nMethod: {pdb_info['experimental_method']}"
        text += f"\nResolution: {pdb_info['resolution']}"
        text += f"\nOrganism: {pdb_info['organism']}"
        text += f"\nLigands: {', '.join(pdb_info['ligands'])}"

        text += "\n\n--- TRY IN VIEWER ---"
        text += "\n- show surface"
        text += "\n- highlight ligand"
        text += "\n- show interactions"
        text += "\n- color protein red"

    # ================= FINAL =================

    return {
        "mode": "visualization" if actions else "information",
        "text": text,
        "actions": actions
    }


# ================= STREAM =================

async def generate_plan_stream(user_prompt: str, mode="free"):

    plan = await generate_plan(user_prompt, mode)
    text = plan.get("text", "")

    for char in text:
        yield char
        await asyncio.sleep(0.01)