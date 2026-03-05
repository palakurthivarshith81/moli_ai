import { getViewer } from "./molstarEngine";
import { parseIntent } from "./ai/intentParser";

export async function executeCommand(command) {

  const viewer = getViewer();

  if (!viewer) {
    console.log("Viewer not ready");
    return;
  }

  const intent = parseIntent(command);

  if (intent.type === "load_protein") {

    console.log("Loading PDB:", intent.pdb);

    await viewer.loadPdb(intent.pdb);

    return;
  }

}