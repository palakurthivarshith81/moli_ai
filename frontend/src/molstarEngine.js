import { Viewer } from "molstar/build/viewer/molstar";

let viewer = null;

export async function initViewer(container) {
  viewer = await Viewer.create(container, {
    layoutIsExpanded: false,
    layoutShowControls: false,
    layoutShowLeftPanel: false,
    layoutShowSequence: false,
    layoutShowLog: false
  });
}

export function getViewer() {
  return viewer;
}