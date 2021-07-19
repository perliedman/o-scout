import create from "zustand";
import produce, { applyPatches, enablePatches } from "immer";
import * as Event from "./models/event";
import { createCourse } from "./models/course";
import { useMemo } from "react";

enablePatches();

export const useMap = create((set) => ({
  mapFile: undefined,
  mapInstance: undefined,
  clipGeometry: undefined,
  clipLayer: undefined,
  setMapFile: (mapFilename, mapFile, tiler) =>
    set((state) => ({ ...state, mapFile, mapFilename, tiler })),
  setMapInstance: (map) => set((state) => ({ ...state, map })),
  setClipGeometry: (clipGeometry) =>
    set((state) => ({ ...state, clipGeometry })),
  setClipLayer: (clipLayer) => set((state) => ({ ...state, clipLayer })),
  setControlsSource: (controlsSource) =>
    set((state) => ({ ...state, controlsSource })),
}));

export function useCrs() {
  const mapFile = useMap(getMapFile);
  return useMemo(() => mapFile?.getCrs(), [mapFile]);
}

function getMapFile({ mapFile }) {
  return mapFile;
}

const history = {};
let currentVersion = -1;
const maxHistoryLength = 40;

const useEvent = create((set) => ({
  ...Event.create("New event", [
    createCourse(1, "New course", [], 15000, "normal"),
    createCourse("all-controls", "All Controls", [], 15000, "all-controls", {
      labelKind: "code",
    }),
  ]),
  actions: {
    event: {
      set: (event) =>
        set((state) => ({
          ...state,
          ...event,
          selectedCourseId: event.courses?.[0]?.id,
        })),
      setMap: (mapFile) =>
        set((state) => {
          const mapScale = mapFile.getCrs().scale;
          return {
            ...state,
            mapScale,
            courses: state.courses.map((course) =>
              course.controls.length > 0
                ? course
                : { ...course, printScale: mapScale }
            ),
          };
        }),
      setName: (name) =>
        set(
          undoable((draft) => {
            draft.name = name;
          })
        ),
      addControl: (options, courseId) =>
        set(
          undoable((draft) => {
            const control = Event.addControl(draft, options);
            if (courseId) {
              const draftCourse = findCourse(draft, courseId);

              draftCourse.controls.push(control);
            }
          })
        ),
    },
    course: {
      setSelected: (selectedCourseId) =>
        set((state) => ({ ...state, selectedCourseId })),
      setName: (courseId, name) =>
        set(
          undoable((draft) => {
            const draftCourse = findCourse(draft, courseId);
            draftCourse.name = name;
          })
        ),
      setPrintAreaExtent: (courseId, extent) =>
        set(
          undoable((draft) => {
            const draftCourse = findCourse(draft, courseId);
            draftCourse.printArea.auto = false;
            draftCourse.printArea.extent = extent;
          })
        ),
    },
    control: {
      remove: (courseId, controlId) =>
        set(
          undoable((draft) => {
            const draftCourse = findCourse(draft, courseId);
            const controlIndex = draftCourse.controls.findIndex(
              ({ id }) => id === controlId
            );
            draftCourse.controls.splice(controlIndex, 1);
          })
        ),
      setCoordinates: (courseId, controlId, coordinates) =>
        set(
          undoable((draft) => {
            const draftCourse = findCourse(draft, courseId);
            const draftControl = draftCourse.controls.find(
              (c) => c.id === controlId
            );
            draftControl.coordinates = coordinates;
          })
        ),
    },
  },
  undo: () => set(undo),
  redo: () => set(redo),
}));

function findCourse(event, courseId) {
  const course = event.courses.find((c) => c.id === courseId);
  if (course) {
    return course;
  } else {
    throw new Error(`Can't find course with id ${courseId}`);
  }
}

export default useEvent;

export const useUndo = () => useEvent(getUndoRedo);

function getUndoRedo({ undo, redo }) {
  return {
    undo: history[currentVersion]?.undo && undo,
    redo: history[currentVersion + 1]?.redo && redo,
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
  if (!history[currentVersion]?.undo) return;
  return applyPatches(state, history[currentVersion--].undo);
}

function redo(state) {
  if (!history[currentVersion + 1]?.redo) return;
  return applyPatches(state, history[++currentVersion].redo);
}

export const useNotifications = create((set) => ({
  notifications: [],
  push: (type, message, detail) =>
    set((state) => ({
      ...state,
      notifications: [...state.notifications, { type, message, detail }],
    })),
  pop: () =>
    set((state) => ({ ...state, notifications: state.notifications.slice(1) })),
}));
