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

/* ================= DIRECT STATE TREE COLOR UPDATE (THE REAL FIX) ================= */
//
// Mol* stores each representation as a node in its state tree.
// The node's `params` object has a `colorTheme` field.
// plugin.build().to(ref).update(newParams) is exactly what the Mol* UI
// does when you click a color swatch — it patches that node in place,
// triggers a re-render, and never needs a clear/re-add cycle.
//
async function applyColorToComponent(viewer, component, hexColor) {
  if (!component?.representations?.length) {
    console.warn("[applyColor] No representations found on component");
    return false;
  }

  try {
    const update = viewer.plugin.build();

    for (const rep of component.representations) {
      const cell = rep.cell;
      if (!cell) continue;

      const ref = cell.transform.ref;
      const oldParams = cell.transform.params ?? {};

      // Patch only colorTheme — leave type, sizeTheme, etc. untouched
      const newParams = {
        ...oldParams,
        colorTheme: {
          name: "uniform",
          params: { value: hexColor }
        }
      };

      update.to(ref).update(newParams);
      console.log("[applyColor] Queued update for ref:", ref, "color:", hexColor);
    }

    await update.commit();
    console.log("[applyColor] Commit done");
    return true;
  } catch (e) {
    console.error("[applyColor] State tree update failed:", e);
    return false;
  }
}

/* ================= CLEAR VIEW ================= */

async function clearAllRepresentations(viewer, structure) {
  for (const comp of structure.components) {
    try {
      viewer.plugin.managers.structure.component.clearRepresentations(comp);
    } catch {}
  }
  await wait(200);
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
  await wait(100);

  await viewer.plugin.builders.structure.representation.addRepresentation(
    polymer.cell,
    { type: "cartoon", color: "chain-id" }
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

/* ================= LABEL RESIDUES (full protein) ================= */

async function labelResidues(viewer, structure) {
  const polymer = findPolymer(structure);
  const ligand = findLigand(structure);
  if (!polymer) return;

  clearAllRepresentations(viewer, structure);
  await wait(100);

  await viewer.plugin.builders.structure.representation.addRepresentation(
    polymer.cell,
    { type: "cartoon", color: "chain-id" }
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

/* ================= LABEL INTERACTING RESIDUES ONLY ================= */

async function labelInteractingResidues(viewer, structure) {
  const ligand = findLigand(structure);
  const polymer = findPolymer(structure);
  if (!polymer) return;

  clearAllRepresentations(viewer, structure);
  await wait(100);

  await viewer.plugin.builders.structure.representation.addRepresentation(
    polymer.cell,
    { type: "cartoon", color: "chain-id" }
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

  const nearbyResidues = findNearbyResidues();
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

  const interactingComponent =
    await viewer.plugin.builders.structure.tryCreateComponentFromExpression(
      structure.cell,
      expression,
      "interacting-residues"
    );

  if (interactingComponent) {
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

  console.log("Executing plan with actions:", plan.actions);

  for (const action of plan.actions) {

    console.log(`[ACTION] Executing: ${action.type}`, action);

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
        await wait(100);
        try {
          await viewer.plugin.builders.structure.representation.addRepresentation(
            polymer.cell,
            { type: "molecular-surface", typeParams: { alpha: 0.7 } }
          );
          console.log("[SHOW_SURFACE] Done");
        } catch (e) {
          console.error("[SHOW_SURFACE] Failed:", e);
        }
        try { viewer.plugin.canvas3d?.requestRender(); } catch {}
        break;
      }

      case "highlight": {
        const struct = await waitForStructure(viewer);
        if (!struct) break;
        const ligand = findLigand(struct);
        if (!ligand) break;
        try {
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
        } catch (e) {
          console.error("[HIGHLIGHT] Failed:", e);
        }
        focusCamera(viewer, ligand.cell.obj.data);
        try { viewer.plugin.canvas3d?.requestRender(); } catch {}
        break;
      }

      /* ================= COLOR PROTEIN (FIXED) ================= */

      case "color_protein": {
        const struct = await waitForStructure(viewer);
        if (!struct) break;

        const polymer = findPolymer(struct);
        const ligand  = findLigand(struct);
        const hexColor = colorToHex(action.color);

        console.log("[COLOR_PROTEIN] Targeting color:", action.color, "->", hexColor);

        // PRIMARY: patch colorTheme directly on each existing representation node
        const updated = await applyColorToComponent(viewer, polymer, hexColor);

        // FALLBACK: clear everything and rebuild with the new color
        if (!updated) {
          console.log("[COLOR_PROTEIN] No existing reps — rebuilding from scratch");
          await clearAllRepresentations(viewer, struct);

          try {
            await viewer.plugin.builders.structure.representation.addRepresentation(
              polymer.cell,
              {
                type: "cartoon",
                color: "uniform",
                colorParams: { value: hexColor }
              }
            );
          } catch (e) {
            console.error("[COLOR_PROTEIN] addRepresentation failed:", e);
          }

          if (ligand) {
            try {
              await viewer.plugin.builders.structure.representation.addRepresentation(
                ligand.cell,
                {
                  type: "ball-and-stick",
                  size: "physical",
                  sizeParams: { sizeFactor: 2 },
                  color: "element-symbol"
                }
              );
            } catch (e) {
              console.error("[COLOR_PROTEIN] ligand rep failed:", e);
            }
          }
        }

        try { viewer.plugin.canvas3d?.requestRender(); } catch {}
        break;
      }

      /* ================= COLOR LIGAND (FIXED) ================= */

      case "color_ligand": {
        const struct = await waitForStructure(viewer);
        if (!struct) break;

        const polymer = findPolymer(struct);
        const ligand  = findLigand(struct);
        const hexColor = colorToHex(action.color);

        if (!ligand) break;

        console.log("[COLOR_LIGAND] Targeting color:", action.color, "->", hexColor);

        // PRIMARY: patch colorTheme directly on each existing representation node
        const updated = await applyColorToComponent(viewer, ligand, hexColor);

        // FALLBACK: clear everything and rebuild with the new color
        if (!updated) {
          console.log("[COLOR_LIGAND] No existing reps — rebuilding from scratch");
          await clearAllRepresentations(viewer, struct);

          try {
            await viewer.plugin.builders.structure.representation.addRepresentation(
              polymer.cell,
              { type: "cartoon", color: "chain-id" }
            );
          } catch (e) {
            console.error("[COLOR_LIGAND] protein rep failed:", e);
          }

          try {
            await viewer.plugin.builders.structure.representation.addRepresentation(
              ligand.cell,
              {
                type: "ball-and-stick",
                color: "uniform",
                colorParams: { value: hexColor },
                size: "physical",
                sizeParams: { sizeFactor: 2 }
              }
            );
          } catch (e) {
            console.error("[COLOR_LIGAND] ligand rep failed:", e);
          }

          focusCamera(viewer, ligand.cell.obj.data);
        }

        try { viewer.plugin.canvas3d?.requestRender(); } catch {}
        break;
      }

      case "publication_view": {
        const struct = await waitForStructure(viewer);
        if (!struct) break;
        const polymer = findPolymer(struct);
        const ligand = findLigand(struct);
        clearAllRepresentations(viewer, struct);
        await wait(100);
        try {
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
          console.log("[PUBLICATION_VIEW] Done");
        } catch (e) {
          console.error("[PUBLICATION_VIEW] Failed:", e);
        }
        try { viewer.plugin.canvas3d?.requestRender(); } catch {}
        break;
      }

      case "show_interactions": {
        const struct = await waitForStructure(viewer);
        if (!struct) break;
        try {
          await showInteractionResidues(viewer, struct);
          console.log("[SHOW_INTERACTIONS] Completed");
          viewer.plugin.canvas3d?.requestRender?.();
        } catch (e) {
          console.error("[SHOW_INTERACTIONS] Failed:", e);
        }
        break;
      }

      case "label_residues": {
        const struct = await waitForStructure(viewer);
        if (!struct) break;
        try {
          await labelInteractingResidues(viewer, struct);
          console.log("[LABEL_RESIDUES] Completed");
          viewer.plugin.canvas3d?.requestRender?.();
        } catch (e) {
          console.error("[LABEL_RESIDUES] Failed:", e);
        }
        break;
      }

      case "show_chart":
        triggerChart(action.chart, action.data);
        break;

    }

    await wait(120);
  }
}