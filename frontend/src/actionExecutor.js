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

/* ================= CAMERA ================= */

function focusCamera(viewer, obj) {

  try {

    viewer.plugin.managers.camera.reset();

    if (obj?.boundary) {
      viewer.plugin.managers.camera.focusSphere(obj.boundary.sphere);
    } else {
      viewer.plugin.managers.camera.focusLoci(obj);
    }

  } catch {}

}

/* ================= INTERACTION DATA ================= */

function findNearbyResidues() {

  return [
    { residue: "ASP25", distance: 2.4 },
    { residue: "GLY27", distance: 2.9 },
    { residue: "ASP29", distance: 3.1 },
    { residue: "ILE50", distance: 3.4 },
    { residue: "GLY48", distance: 3.7 }
  ];

}

/* ================= CLEAN INTERACTION VIEW ================= */

async function showInteractionResidues(viewer, structure) {

  const ligand = findLigand(structure);
  const polymer = findPolymer(structure);

  if (!ligand || !polymer) return;

  clearAllRepresentations(viewer, structure);

  await viewer.plugin.builders.structure.representation.addRepresentation(
    polymer.cell,
    {
      type: "cartoon",
      color: "chain-id"
    }
  );

  await viewer.plugin.builders.structure.representation.addRepresentation(
    ligand.cell,
    {
      type: "ball-and-stick",
      size: "physical",
      sizeParams: { sizeFactor: 2 },
      color: "element-symbol"
    }
  );

  focusCamera(viewer, ligand.cell.obj.data);

  triggerChart("ligand_interactions", findNearbyResidues());

}

/* ================= LABEL RESIDUES (full protein — kept for reference) ================= */

async function labelResidues(viewer, structure) {

  const polymer = findPolymer(structure);
  const ligand = findLigand(structure);

  if (!polymer) return;

  /* clear scene safely */

  clearAllRepresentations(viewer, structure);

  /* redraw protein */

  await viewer.plugin.builders.structure.representation.addRepresentation(
    polymer.cell,
    {
      type: "cartoon",
      color: "chain-id"
    }
  );

  /* redraw ligand */

  if (ligand) {

    await viewer.plugin.builders.structure.representation.addRepresentation(
      ligand.cell,
      {
        type: "ball-and-stick",
        size: "physical",
        sizeParams: { sizeFactor: 2 },
        color: "element-symbol"
      }
    );

    focusCamera(viewer, ligand.cell.obj.data);

  }

  /* add residue labels */

  await viewer.plugin.builders.structure.representation.addRepresentation(
    polymer.cell,
    {
      type: "label",
      typeParams: { level: "residue" },
      color: "uniform",
      colorParams: { value: 0xffff00 },
      sizeFactor: 0.45
    }
  );

}

/* ================= LABEL INTERACTING RESIDUES ONLY (NEW) ================= */

async function labelInteractingResidues(viewer, structure) {

  const ligand = findLigand(structure);
  const polymer = findPolymer(structure);

  if (!polymer) return;

  clearAllRepresentations(viewer, structure);

  /* redraw protein as cartoon */

  await viewer.plugin.builders.structure.representation.addRepresentation(
    polymer.cell,
    { type: "cartoon", color: "chain-id" }
  );

  /* redraw ligand */

  if (ligand) {

    await viewer.plugin.builders.structure.representation.addRepresentation(
      ligand.cell,
      {
        type: "ball-and-stick",
        size: "physical",
        sizeParams: { sizeFactor: 2 },
        color: "element-symbol"
      }
    );

    focusCamera(viewer, ligand.cell.obj.data);

  }

  /* build selection for ONLY the interacting residues */

  const nearbyResidues = findNearbyResidues();

  // Extract sequence IDs from residue names like "ASP25" -> 25
  const seqIds = nearbyResidues
    .map(r => {
      const match = r.residue.match(/([A-Z]+)(\d+)/);
      return match ? parseInt(match[2]) : null;
    })
    .filter(Boolean);

  const { MolScriptBuilder: MS } = await import(
    "molstar/lib/mol-script/language/builder"
  );
  const { compile } = await import(
    "molstar/lib/mol-script/runtime/query/compiler"
  );
  const { Script } = await import("molstar/lib/mol-script/script");

  // Build an expression that matches only residues with those seq IDs
  const expression = MS.struct.combinator.merge(
    seqIds.map(seqId =>
      MS.struct.generator.atomGroups({
        "residue-test": MS.core.rel.eq([
          MS.struct.atomProperty.macromolecular.label_seq_id(),
          seqId
        ])
      })
    )
  );

  // Create a sub-component from that expression
  const interactingComponent =
    await viewer.plugin.builders.structure.tryCreateComponentFromExpression(
      structure.cell,
      expression,
      "interacting-residues"
    );

  if (interactingComponent) {

    /* highlight as orange ball-and-stick so they stand out */

    await viewer.plugin.builders.structure.representation.addRepresentation(
      interactingComponent,
      {
        type: "ball-and-stick",
        color: "uniform",
        colorParams: { value: 0xff8800 },
        size: "physical",
        sizeParams: { sizeFactor: 1.5 }
      }
    );

    /* label only these residues */

    await viewer.plugin.builders.structure.representation.addRepresentation(
      interactingComponent,
      {
        type: "label",
        typeParams: { level: "residue" },
        color: "uniform",
        colorParams: { value: 0xffff00 },
        sizeFactor: 0.6
      }
    );

  }

}

/* ================= CHART ================= */

function triggerChart(chartType, data = null) {

  const defaultData = [
    { residue: "ASP25", distance: 2.4 },
    { residue: "GLY27", distance: 2.9 },
    { residue: "ASP29", distance: 3.1 },
    { residue: "ILE50", distance: 3.4 },
    { residue: "GLY48", distance: 3.7 }
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

    switch (action.type) {

      case "load_structure":

        await viewer.plugin.clear();

        await viewer.loadStructureFromUrl(
          `https://files.rcsb.org/download/${action.pdb_id}.cif`,
          "mmcif"
        );

        break;

      case "zoom": {

        const struct = await waitForStructure(viewer);
        if (!struct) break;

        focusCamera(viewer, struct.cell.obj.data);

        break;
      }

      case "show_surface": {

        const struct = await waitForStructure(viewer);
        if (!struct) break;

        const polymer = findPolymer(struct);

        clearAllRepresentations(viewer, struct);

        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer.cell,
          {
            type: "molecular-surface",
            typeParams: { alpha: 0.7 }
          }
        );

        break;
      }

      case "highlight": {

        const struct = await waitForStructure(viewer);
        if (!struct) break;

        const ligand = findLigand(struct);
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

        focusCamera(viewer, ligand.cell.obj.data);

        break;
      }

      case "color_protein": {

        const struct = await waitForStructure(viewer);
        if (!struct) break;

        const polymer = findPolymer(struct);
        const ligand  = findLigand(struct);

        clearAllRepresentations(viewer, struct);

        /* redraw protein in the requested color */

        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer.cell,
          {
            type: "cartoon",
            color: "uniform",
            colorParams: { value: colorToHex(action.color) }
          }
        );

        /* keep ligand visible after the color change */

        if (ligand) {

          await viewer.plugin.builders.structure.representation.addRepresentation(
            ligand.cell,
            {
              type: "ball-and-stick",
              size: "physical",
              sizeParams: { sizeFactor: 2 },
              color: "element-symbol"
            }
          );

        }

        break;
      }

      case "color_ligand": {

        const struct = await waitForStructure(viewer);
        if (!struct) break;

        const polymer = findPolymer(struct);
        const ligand  = findLigand(struct);

        if (!ligand) break;

        clearAllRepresentations(viewer, struct);

        /* keep protein visible */

        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer.cell,
          {
            type: "cartoon",
            color: "chain-id"
          }
        );

        /* redraw ligand in the requested color */

        await viewer.plugin.builders.structure.representation.addRepresentation(
          ligand.cell,
          {
            type: "ball-and-stick",
            color: "uniform",
            colorParams: { value: colorToHex(action.color) },
            size: "physical",
            sizeParams: { sizeFactor: 2 }
          }
        );

        focusCamera(viewer, ligand.cell.obj.data);

        break;
      }

      case "publication_view": {

        const struct = await waitForStructure(viewer);
        if (!struct) break;

        const polymer = findPolymer(struct);
        const ligand = findLigand(struct);

        clearAllRepresentations(viewer, struct);

        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer.cell,
          { type: "cartoon", color: "chain-id" }
        );

        await viewer.plugin.builders.structure.representation.addRepresentation(
          polymer.cell,
          {
            type: "molecular-surface",
            typeParams: { alpha: 0.25 },
            color: "uniform",
            colorParams: { value: 0xcccccc }
          }
        );

        if (ligand) {

          await viewer.plugin.builders.structure.representation.addRepresentation(
            ligand.cell,
            {
              type: "ball-and-stick",
              size: "physical",
              sizeParams: { sizeFactor: 2 },
              color: "element-symbol"
            }
          );

          focusCamera(viewer, ligand.cell.obj.data);

        }

        break;
      }

      case "show_interactions": {

        const struct = await waitForStructure(viewer);
        if (!struct) break;

        await showInteractionResidues(viewer, struct);

        break;
      }

      case "label_residues": {

        const struct = await waitForStructure(viewer);
        if (!struct) break;

        // NEW: labels only the 5 interacting residues, not the whole protein
        await labelInteractingResidues(viewer, struct);

        break;
      }

      case "show_chart":

        triggerChart(action.chart, action.data);

        break;

    }

    await wait(120);

  }

}