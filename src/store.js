import create from "zustand";
import produce, { applyPatches } from "immer";

export const useMap = create((set) => ({
  map: undefined,
  setMap: (mapFilename, map) =>
    set((state) => ({ ...state, map, mapFilename })),
}));

const history = {};
let currentVersion = -1;
const maxHistoryLength = 40;

const useStore = create((set) => ({
  event: undefined,
  setEvent: (event) =>
    set(
      undoable((draft) => {
        draft.event = event;
      })
    ),
  undo: () => set(undo),
  redo: () => set(redo),
}));

export default useStore;

function undoable(fn) {
  return (state) =>
    produce(state, fn(), (patches, inversePatches) => {
      currentVersion++;
      history[currentVersion] = { redo: patches, undo: inversePatches };
      delete history[currentVersion + 1];
      delete history[currentVersion - maxHistoryLength];
    });
}

function undo(state) {
  return applyPatches(state, history[currentVersion--].undo);
}

function redo(state) {
  return applyPatches(state, history[++currentVersion].redo);
}
