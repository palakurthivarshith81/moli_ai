import { getViewer } from "./molstarEngine";

export async function executeActions(plan) {

    if (!plan || !plan.actions) return;

    const viewer = getViewer();
    if (!viewer) return;

    for (const action of plan.actions) {

        try {

            // ================================
            // LOAD STRUCTURE
            // ================================
            if (action.type === "load_structure") {

                // Clear previous scene
                await viewer.plugin.clear();

                await viewer.loadStructureFromUrl(
                    `https://files.rcsb.org/download/${action.pdb_id}.pdb`,
                    "pdb"
                );
            }

            // ================================
            // HIGHLIGHT SELECTION
            // ================================
            if (action.type === "highlight") {

                const structure =
                    viewer.plugin.managers.structure.hierarchy.current.structures[0];

                if (!structure) continue;

                const component =
                    await viewer.plugin.builders.structure.tryCreateComponentFromSelection(
                        structure,
                        action.selection
                    );

                // Add ball-and-stick representation for highlight
                await viewer.plugin.builders.structure.representation.addRepresentation(
                    component,
                    {
                        type: "ball-and-stick",
                        color: "element-symbol"
                    }
                );
            }

            // ================================
            // SHOW SURFACE
            // ================================
            if (action.type === "show_surface") {

                const structure =
                    viewer.plugin.managers.structure.hierarchy.current.structures[0];

                if (!structure) continue;

                await viewer.plugin.builders.structure.representation.addRepresentation(
                    structure,
                    {
                        type: "molecular-surface",
                        alpha: 0.3
                    }
                );
            }

            // ================================
            // ZOOM (smooth camera reset)
            // ================================
            if (action.type === "zoom") {
                viewer.plugin.managers.camera.reset({
                    durationMs: 800
                });
            }

        } catch (err) {
            console.error("Action failed:", action, err);
        }
    }
}