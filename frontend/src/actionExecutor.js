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
  for (let i = 0; i < 12; i++) {
    const structures =
      viewer.plugin.managers.structure.hierarchy.current.structures;

    if (structures.length && structures[0].cell?.obj?.data) {
      return structures[0];
    }

    await wait(250);
  }
  return null;
}

function findLigandComponent(structure) {
  return structure.components.find(c => {
    const label = c.cell?.obj?.label?.toLowerCase() || "";
    return label.includes("ligand") || label.includes("non-polymer");
  });
}

// ================= REPLACE =================
async function replaceRepresentation(viewer, component, params) {

  const plugin = viewer.plugin;
  const reps = component.representations || [];

  for (const r of reps) {
    try {
      await plugin.managers.structure.component.removeRepresentation(component, r);
    } catch {}
  }

  await wait(100);

  await plugin.builders.structure.representation.addRepresentation(
    component.cell,
    params
  );

  plugin.canvas3d?.requestDraw(true);
}

// ================= CLEAR =================
function clearAllRepresentations(viewer, structure) {
  structure.components.forEach(c => {
    try {
      viewer.plugin.managers.structure.component.clearRepresentations(c);
    } catch {}
  });
}

export async function executePlan(plan) {

  const viewer = getViewer();
  if (!viewer || !plan?.actions) return;

  for (const action of plan.actions) {

    switch (action.type) {

      // ================= LOAD =================
      case "load_structure":
        try {
          await viewer.plugin.clear();

          await viewer.loadStructureFromUrl(
            `https://files.rcsb.org/download/${action.pdb_id}.cif`,
            "mmcif"
          );

          const structure = await waitForStructure(viewer);
          if (!structure) break;

          continue;

        } catch (err) {
          console.error("Load failed:", err);
        }
        break;

      // ================= ZOOM =================
      case "zoom":
        viewer.plugin.managers.camera.reset();
        break;

      // ================= SURFACE =================
      case "show_surface":

        const structure1 = await waitForStructure(viewer);
        if (!structure1) break;

        await replaceRepresentation(viewer, structure1.components[0], {
          type: "molecular-surface"
        });

        break;

      // ================= HIGHLIGHT =================
      case "highlight":

        const structure2 = await waitForStructure(viewer);
        if (!structure2) break;

        const ligand = findLigandComponent(structure2);
        if (!ligand) break;

        await replaceRepresentation(viewer, ligand, {
          type: "ball-and-stick",
          color: "uniform",
          colorParams: { value: 0xff0000 }
        });

        break;

      // ================= COLOR PROTEIN =================
      case "color_protein":

        const structure3 = await waitForStructure(viewer);
        if (!structure3) break;

        await replaceRepresentation(viewer, structure3.components[0], {
          type: "cartoon",
          color: "uniform",
          colorParams: { value: colorToHex(action.color) }
        });

        break;

      // ================= COLOR LIGAND =================
      case "color_ligand":

        const structure4 = await waitForStructure(viewer);
        if (!structure4) break;

        const ligand2 = findLigandComponent(structure4);
        if (!ligand2) break;

        await replaceRepresentation(viewer, ligand2, {
          type: "ball-and-stick",
          color: "uniform",
          colorParams: { value: colorToHex(action.color) }
        });

        break;

      // =================  PUBLICATION VIEW =================
      case "publication_view":

        console.log("Publication view");

        const structure5 = await waitForStructure(viewer);
        if (!structure5) break;

        const polymer = structure5.components[0];
        const ligand3 = findLigandComponent(structure5);

        //  CLEAR EVERYTHING
        clearAllRepresentations(viewer, structure5);

        // ===== CARTOON (VISIBLE CORE)
        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer.cell,
          {
            type: "cartoon",
            color: "chain-id"
          }
        );

        // ===== SURFACE ( FIXED LOOK)
        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer.cell,
          {
            type: "molecular-surface",
            typeParams: {
              alpha: 0.2  //  MUCH BETTER TRANSPARENCY
            },
            color: "uniform",
            colorParams: {
              value: 0xcccccc   //  LIGHT GRAY (IMPORTANT)
            }
          }
        );

        // ===== LIGAND (FOCUS)
        if (ligand3) {
          await viewer.plugin.builders.structure.representation.addRepresentation(
            ligand3.cell,
            {
              type: "ball-and-stick",
              size: "physical",
              sizeParams: {
              sizeFactor: 1.8  //  increase size
            },

            color: "element-symbol",

            colorParams: {
            value: 0xff0000   //  bright red highlight
              
            }}
            );
        }

        // ===== LIGHTING (PRO LOOK)
        viewer.plugin.canvas3d?.setProps({
          renderer: {
            ambientIntensity: 0.6,
            lightIntensity: 1.2
          }
        });

        viewer.plugin.canvas3d?.requestDraw(true);

        break;

      default:
        console.log("Unknown action:", action.type);
    }

    await wait(80);
  }
}