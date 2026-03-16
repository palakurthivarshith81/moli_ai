import { getViewer } from "./molstarEngine";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function colorToHex(color) {
  const colors = {
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
    yellow: 0xffff00,
    orange: 0xffa500,
    purple: 0x800080,
    cyan: 0x00ffff,
    magenta: 0xff00ff,
    white: 0xffffff,
    gray: 0x808080,
    black: 0x000000
  };

  return colors[color?.toLowerCase()] || 0xffffff;
}

async function waitForStructure(viewer) {
  for (let i = 0; i < 10; i++) {

    const structures =
      viewer.plugin.managers.structure.hierarchy.current.structures;

    if (structures.length && structures[0].cell?.obj?.data) {
      return structures[0];
    }

    await wait(400);
  }

  return null;
}

function findLigandComponent(structure) {

  return structure.components.find(c => {
    const label = c.cell?.obj?.label?.toLowerCase() || "";
    return label.includes("ligand") || label.includes("non-polymer");
  });

}

function removeRepresentations(viewer, component) {

  if (!component?.representations) return;

  component.representations.forEach(rep => {

    try {
      viewer.plugin.state.data.remove(rep.cell.transform.ref);
    } catch (err) {}

  });

}

export async function executePlan(plan) {

  const viewer = getViewer();

  if (!viewer) {
    console.log("Viewer not ready");
    return;
  }

  if (!plan.actions) return;

  for (const action of plan.actions) {

    switch (action.type) {

      // LOAD STRUCTURE
      case "load_structure":

        console.log("Loading structure:", action.pdb_id);

        try {

          await viewer.plugin.clear();

          await viewer.loadStructureFromUrl(
            `https://files.rcsb.org/download/${action.pdb_id}.cif`,
            "mmcif"
          );

          await wait(1800);

        } catch (err) {
          console.error("Structure load failed:", err);
        }

        break;

      // CAMERA RESET
      case "zoom":

        console.log("Reset camera");

        try {
          viewer.plugin.managers.camera.reset();
        } catch (err) {
          console.log("Zoom failed:", err);
        }

        break;

      // SURFACE
      case "show_surface":

        console.log("Showing surface");

        try {

          const structure = await waitForStructure(viewer);
          if (!structure || !structure.components?.length) break;

          const polymer = structure.components[0];

          await viewer.plugin.builders.structure.representation.addRepresentation(
            polymer.cell,
            { type: "molecular-surface" }
          );

          viewer.plugin.canvas3d?.requestDraw();

        } catch (err) {
          console.log("Surface failed:", err);
        }

        break;

      // HIGHLIGHT LIGAND
      case "highlight":

        console.log("Highlight ligand:", action.selection);

        try {

          const structure = await waitForStructure(viewer);
          if (!structure) break;

          const ligandComponent = findLigandComponent(structure);

          if (!ligandComponent) {
            console.log("Ligand component not found");
            break;
          }

          removeRepresentations(viewer, ligandComponent);

          await viewer.plugin.builders.structure.representation.addRepresentation(
            ligandComponent.cell,
            {
              type: "ball-and-stick",
              color: "uniform",
              colorParams: { value: 0xff0000 }
            }
          );

          viewer.plugin.canvas3d?.requestDraw();

        } catch (err) {
          console.error("Highlight failed:", err);
        }

        break;

      // COLOR PROTEIN
      case "color_protein":

        console.log("Color protein:", action.color);

        try {

          const structure = await waitForStructure(viewer);
          if (!structure || !structure.components?.length) break;

          const polymer = structure.components[0];

          removeRepresentations(viewer, polymer);

          await viewer.plugin.builders.structure.representation.addRepresentation(
            polymer.cell,
            {
              type: "cartoon",
              color: "uniform",
              colorParams: { value: colorToHex(action.color) }
            }
          );

          viewer.plugin.canvas3d?.requestDraw();

          console.log("Protein recolored");

        } catch (err) {
          console.error("Protein color failed:", err);
        }

        break;

      // COLOR LIGAND
      case "color_ligand":

        console.log("Color ligand:", action.color);

        try {

          const structure = await waitForStructure(viewer);
          if (!structure) break;

          const ligandComponent = findLigandComponent(structure);
          if (!ligandComponent) break;

          removeRepresentations(viewer, ligandComponent);

          await viewer.plugin.builders.structure.representation.addRepresentation(
            ligandComponent.cell,
            {
              type: "ball-and-stick",
              color: "uniform",
              colorParams: { value: colorToHex(action.color) }
            }
          );

          viewer.plugin.canvas3d?.requestDraw();

          console.log("Ligand recolored");

        } catch (err) {
          console.error("Ligand color failed:", err);
        }

        break;

      default:
        console.log("Unknown action:", action.type);

    }

    await wait(200);
  }
}