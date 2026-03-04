import re

def extract_pdb_id(text: str):
    match = re.search(r"\b[0-9][A-Za-z0-9]{3}\b", text)
    return match.group(0).upper() if match else None