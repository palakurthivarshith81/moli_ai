let viewer = null;

export async function initViewer(container) {

  viewer = await window.molstar.Viewer.create(container, {
    layoutIsExpanded: false,
    layoutShowControls: true,
    layoutShowSequence: true,
    layoutShowLog: false
  });

  // CLICK DETECTION
  viewer.plugin.behaviors.interaction.click.subscribe(event => {

    const loci = event.current.loci;

    if (!loci) return;

    console.log("Clicked structure element", loci);

    // notify UI for charts
    window.dispatchEvent(
      new CustomEvent("compound-click", {
        detail: loci
      })
    );

  });

}

export function getViewer() {
  return viewer;
}