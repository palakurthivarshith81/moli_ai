import { getViewer } from "./molstarEngine";

/* ================= UTILITIES ================= */

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

/* ================= STRUCTURE WAIT ================= */

async function waitForStructure(viewer) {

  for (let i = 0; i < 15; i++) {

    const structures =
      viewer.plugin.managers.structure.hierarchy.current.structures;

    if (structures.length && structures[0].cell?.obj?.data) {
      return structures[0];
    }

    await wait(200);
  }

  return null;
}

/* ================= COMPONENT FINDERS ================= */

function findPolymer(structure) {
  return structure.components.find(c =>
    c.cell?.obj?.label?.toLowerCase().includes("polymer")
  ) || structure.components[0];
}

function findLigand(structure) {

  return structure.components.find(c => {

    const label = c.cell?.obj?.label?.toLowerCase() || "";

    return label.includes("ligand") || label.includes("non-polymer");

  });
}

/* ================= CLEAR VIEW ================= */

function clearAllRepresentations(viewer, structure) {

  structure.components.forEach(c => {

    try {
      viewer.plugin.managers.structure.component.clearRepresentations(c);
    } catch {}

  });

}

/* ================= REFRESH ================= */

function refreshViewer(viewer) {

  viewer.plugin.managers.camera.reset();
  viewer.plugin.canvas3d?.requestDraw(true);

}

/* ================= RESIDUE LABELS ================= */

async function labelResiduesNearLigand(viewer, structure) {

  const ligand = findLigand(structure);
  if (!ligand) return;

  await viewer.plugin.builders.structure.representation.addRepresentation(
    ligand.cell,
    {
      type: "label",
      color: "uniform",
      colorParams: { value: 0xffffff },
      sizeFactor: 1.5
    }
  );

  viewer.plugin.canvas3d?.requestDraw(true);
}

/* ================= BINDING POCKET ================= */

async function showBindingPocket(viewer, structure) {

  const polymer = findPolymer(structure);

  await viewer.plugin.builders.structure.representation.addRepresentation(
    polymer.cell,
    {
      type: "molecular-surface",
      typeParams: { alpha: 0.35 },
      color: "uniform",
      colorParams: { value: 0xcccccc }
    }
  );

  viewer.plugin.canvas3d?.requestDraw(true);
}

/* ================= CHART TRIGGER ================= */

function triggerChart(chartType, data = null) {

  const defaultData = [
    { residue: "HIS93", distance: 2.1 },
    { residue: "VAL68", distance: 3.2 },
    { residue: "LEU29", distance: 3.8 }
  ];

  window.dispatchEvent(
    new CustomEvent("molstar-chart", {
      detail: {
        chartType,
        data: data || defaultData
      }
    })
  );
}

/* ================= EXECUTION ENGINE ================= */

export async function executePlan(plan) {

  const viewer = getViewer();
  if (!viewer || !plan?.actions) return;

  for (const action of plan.actions) {

    console.log("Executing action:", action);

    switch (action.type) {

      /* ================= LOAD STRUCTURE ================= */

      case "load_structure":

        try {

          await viewer.plugin.clear();

          await viewer.loadStructureFromUrl(
            `https://files.rcsb.org/download/${action.pdb_id}.cif`,
            "mmcif"
          );

          const structure = await waitForStructure(viewer);
          if (!structure) break;

          refreshViewer(viewer);

        } catch (err) {

          console.error("Load failed:", err);

        }

        break;

      /* ================= ZOOM ================= */

      case "zoom":

        const zoomStruct = await waitForStructure(viewer);
        if (!zoomStruct) break;

        viewer.plugin.managers.camera.focusLoci(
          zoomStruct.cell.obj.data
        );

        viewer.plugin.canvas3d?.requestDraw(true);

        break;

      /* ================= SHOW SURFACE ================= */

      case "show_surface":

        const surfaceStruct = await waitForStructure(viewer);
        if (!surfaceStruct) break;

        const polymer1 = findPolymer(surfaceStruct);

        clearAllRepresentations(viewer, surfaceStruct);

        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer1.cell,
          {
            type: "molecular-surface",
            typeParams: { alpha: 0.7 }
          }
        );

        refreshViewer(viewer);

        break;

      /* ================= HIGHLIGHT LIGAND ================= */

      case "highlight":

        const struct2 = await waitForStructure(viewer);
        if (!struct2) break;

        const ligand = findLigand(struct2);
        if (!ligand) break;

        await viewer.plugin.builders.structure.representation.addRepresentation(
          ligand.cell,
          {
            type: "ball-and-stick",
            color: "uniform",
            colorParams: { value: 0xff0000 },
            size: "physical",
            sizeParams: { sizeFactor: 2 }
          }
        );

        viewer.plugin.managers.camera.focusLoci(
          ligand.cell.obj.data
        );

        viewer.plugin.canvas3d?.requestDraw(true);

        /* AUTO SHOW CHART */

        triggerChart("ligand_interactions");

        break;

      /* ================= COLOR PROTEIN ================= */

      case "color_protein":

        const struct3 = await waitForStructure(viewer);
        if (!struct3) break;

        const polymer = findPolymer(struct3);

        clearAllRepresentations(viewer, struct3);

        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer.cell,
          {
            type: "cartoon",
            color: "uniform",
            colorParams: { value: colorToHex(action.color) }
          }
        );

        refreshViewer(viewer);

        break;

      /* ================= COLOR LIGAND ================= */

      case "color_ligand":

        const struct4 = await waitForStructure(viewer);
        if (!struct4) break;

        const ligand2 = findLigand(struct4);
        if (!ligand2) break;

        await viewer.plugin.builders.structure.representation.addRepresentation(
          ligand2.cell,
          {
            type: "ball-and-stick",
            color: "uniform",
            colorParams: { value: colorToHex(action.color) }
          }
        );

        viewer.plugin.managers.camera.focusLoci(
          ligand2.cell.obj.data
        );

        viewer.plugin.canvas3d?.requestDraw(true);

        break;

      /* ================= PUBLICATION VIEW ================= */

      case "publication_view":

        const struct5 = await waitForStructure(viewer);
        if (!struct5) break;

        const polymer5 = findPolymer(struct5);
        const ligand3 = findLigand(struct5);

        clearAllRepresentations(viewer, struct5);

        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer5.cell,
          { type: "cartoon", color: "chain-id" }
        );

        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer5.cell,
          {
            type: "molecular-surface",
            typeParams: { alpha: 0.25 },
            color: "uniform",
            colorParams: { value: 0xcccccc }
          }
        );

        if (ligand3) {

          await viewer.plugin.builders.structure.representation.addRepresentation(
            ligand3.cell,
            {
              type: "ball-and-stick",
              size: "physical",
              sizeParams: { sizeFactor: 2 },
              color: "element-symbol"
            }
          );

          viewer.plugin.managers.camera.focusLoci(
            ligand3.cell.obj.data
          );

        }

        viewer.plugin.canvas3d?.requestDraw(true);

        break;

      /* ================= RESIDUE LABELING ================= */

      case "label_residues":

        const struct7 = await waitForStructure(viewer);
        if (!struct7) break;

        await labelResiduesNearLigand(viewer, struct7);

        break;

      /* ================= BINDING POCKET ================= */

      case "show_binding_pocket":

        const struct8 = await waitForStructure(viewer);
        if (!struct8) break;

        await showBindingPocket(viewer, struct8);

        break;

      /* ================= CHART ================= */

      case "show_chart":

        triggerChart(action.chart, action.data);

        break;

      default:

        console.log("Unknown action:", action.type);

    }

    await wait(150);
  }
}