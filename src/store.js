import create from "zustand";
import produce, { applyPatches, enablePatches } from "immer";
import { createEvent } from "./models/event";
import { createCourse } from "./models/course";

enablePatches();

export const useMap = create((set) => ({
  mapFile: undefined,
  setMapFile: (mapFilename, mapFile) =>
    set((state) => ({ ...state, mapFile, mapFilename })),
  setMapInstance: (map) => set((state) => ({ ...state, map })),
}));

const history = {};
let currentVersion = -1;
const maxHistoryLength = 40;

const useEvent = create((set) => ({
  ...createEvent("New event", [createCourse(1, "New course")]),
  actions: {
    event: {
      set: (event) =>
        set((state) => ({
          ...state,
          ...event,
          selectedCourseId: event.courses[0].id,
        })),
    },
    course: {
      setSelected: (selectedCourseId) =>
        set((state) => ({ ...state, selectedCourseId })),
      setName: (courseId, name) =>
        set(
          undoable((draft) => {
            const draftCourse = draft.courses.find((c) => c.id === courseId);
            if (!draftCourse)
              throw new Error(`Can't find course with id ${courseId}`);
            draftCourse.name = name;
          })
        ),
    },
  },
  undo: () => set(undo),
  redo: () => set(redo),
}));

export default useEvent;

export const useUndo = () => useEvent(getUndoRedo);

function getUndoRedo({ undo, redo }) {
  return {
    undo: currentVersion >= 0 && undo,
    redo: history[currentVersion + 1] && redo,
  };
}

function undoable(fn) {
  return (state) =>
    produce(state, fn, (patches, inversePatches) => {
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
