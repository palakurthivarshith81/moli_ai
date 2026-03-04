import requests

BASE_CORE_URL = "https://data.rcsb.org/rest/v1/core"
BASE_PDB_FILE_URL = "https://files.rcsb.org/download"


# ==========================================
# 🔬 Extract ligands from actual PDB file
# ==========================================
def extract_ligands_from_pdb(pdb_id: str):
    pdb_url = f"{BASE_PDB_FILE_URL}/{pdb_id}.pdb"
    resp = requests.get(pdb_url, timeout=10)

    if resp.status_code != 200:
        return []

    ligands = set()

    for line in resp.text.splitlines():
        if line.startswith("HETATM"):
            res_name = line[17:20].strip()

            # Exclude water
            if res_name not in ["HOH", "WAT"]:
                ligands.add(res_name)

    return list(ligands)


# ==========================================
# 🔬 Main fetch function
# ==========================================
def fetch_pdb_info(pdb_id: str):
    pdb_id = pdb_id.upper()

    try:
        # ===============================
        # 1️⃣ Fetch Entry Metadata
        # ===============================
        entry_resp = requests.get(f"{BASE_CORE_URL}/entry/{pdb_id}", timeout=10)
        if entry_resp.status_code != 200:
            return None

        data = entry_resp.json()

        title = data.get("struct", {}).get("title", "Not available")

        exptl = data.get("exptl", [])
        experimental_method = (
            exptl[0].get("method") if exptl else "Not available"
        )

        resolution_list = data.get("rcsb_entry_info", {}).get("resolution_combined")
        resolution = (
            resolution_list[0] if resolution_list else "Not available"
        )

        deposition_date = data.get(
            "rcsb_accession_info", {}
        ).get("deposit_date", "Not available")

        entry_info = data.get("rcsb_entry_info", {})

        polymer_count = entry_info.get("polymer_entity_count", 0)
        molecular_weight = entry_info.get("molecular_weight", "Not available")

        # ===============================
        # 2️⃣ Organism Detection
        # ===============================
        organism_set = set()

        for i in range(1, polymer_count + 1):
            poly_resp = requests.get(
                f"{BASE_CORE_URL}/polymer_entity/{pdb_id}/{i}",
                timeout=10
            )

            if poly_resp.status_code == 200:
                poly_data = poly_resp.json()
                src = poly_data.get("rcsb_entity_source_organism", [])

                if src and src[0].get("scientific_name"):
                    organism_set.add(src[0]["scientific_name"])

        organism = ", ".join(organism_set) if organism_set else "Not available"

        # ===============================
        # 3️⃣ Ligand Detection (REAL)
        # ===============================
        ligands = extract_ligands_from_pdb(pdb_id)

        return {
            "pdb_id": pdb_id,
            "title": title,
            "experimental_method": experimental_method,
            "resolution": resolution,
            "organism": organism,
            "polymer_entity_count": polymer_count,
            "molecular_weight": molecular_weight,
            "ligands": ligands if ligands else ["None"],
            "deposition_date": deposition_date
        }

    except Exception:
        return None