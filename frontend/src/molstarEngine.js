let viewer = null;

export async function initViewer(container) {

  viewer = await window.molstar.Viewer.create(container, {
    layoutIsExpanded: false,
    layoutShowControls: true,
    layoutShowSequence: true,
    layoutShowLog: false
  });

}

export function getViewer() {
  return viewer;
}