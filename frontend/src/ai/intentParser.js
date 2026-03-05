import { extractPDB } from "../utils/pdbDetector";

export function parseIntent(text) {

  const pdb = extractPDB(text);

  if (pdb) {
    return {
      type: "load_protein",
      pdb
    };
  }

  if (text.includes("distance")) {
    return { type: "measure_distance" };
  }

  if (text.includes("surface")) {
    return { type: "show_surface" };
  }

  return { type: "chat" };
}