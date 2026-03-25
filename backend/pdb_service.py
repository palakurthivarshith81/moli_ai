import requests

BASE_CORE = "https://data.rcsb.org/rest/v1/core"
PDB_FILE = "https://files.rcsb.org/download"


# ======================================
# Extract ligands from PDB file
# ======================================
def extract_ligands(pdb_id):

    try:
        res = requests.get(f"{PDB_FILE}/{pdb_id}.pdb", timeout=10)

        ligands = set()

        for line in res.text.splitlines():
            if line.startswith("HETATM"):
                name = line[17:20].strip()

                if name not in ["HOH", "WAT"]:
                    ligands.add(name)

        return list(ligands) if ligands else ["None"]

    except:
        return ["None"]


# ======================================
# Fetch full PDB info
# ======================================
def fetch_pdb_info(pdb_id):

    pdb_id = pdb_id.upper()

    try:
        # -----------------------
        # ENTRY DATA
        # -----------------------
        res = requests.get(f"{BASE_CORE}/entry/{pdb_id}", timeout=10)

        if res.status_code != 200:
            return None

        data = res.json()

        title = data.get("struct", {}).get("title", "Not available")

        method = data.get("exptl", [{}])[0].get("method", "Not available")

        resolution = (
            data.get("rcsb_entry_info", {})
            .get("resolution_combined", ["Not available"])[0]
        )

        polymer_count = data.get("rcsb_entry_info", {}).get("polymer_entity_count", 0)

        # -----------------------
        # ORGANISM DATA
        # -----------------------
        organisms = set()

        for i in range(1, polymer_count + 1):

            poly = requests.get(
                f"{BASE_CORE}/polymer_entity/{pdb_id}/{i}",
                timeout=10
            )

            if poly.status_code == 200:
                poly_data = poly.json()

                src = poly_data.get("rcsb_entity_source_organism", [])

                if src and src[0].get("scientific_name"):
                    organisms.add(src[0]["scientific_name"])

        organism = ", ".join(organisms) if organisms else "Not available"

        # -----------------------
        # LIGANDS
        # -----------------------
        ligands = extract_ligands(pdb_id)

        return {
            "pdb_id": pdb_id,
            "title": title,
            "experimental_method": method,
            "resolution": resolution,
            "organism": organism,
            "ligands": ligands
        }

    except Exception as e:
        print("PDB ERROR:", str(e))
        return None