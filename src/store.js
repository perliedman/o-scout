import create from "zustand";
import { persist } from "zustand/middleware";
import produce, { applyPatches, enablePatches } from "immer";
import * as Event from "./models/event";
import * as Control from "./models/control";
import * as Course from "./models/course";
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

const useEvent = create(
  persist(
    (set) => ({
      ...createNewEvent(),
      actions: {
        event: {
          set: (event) =>
            set((state) => ({
              ...state,
              ...event,
              selectedCourseId: event.courses?.[0]?.id,
            })),
          setMap: (mapFile, mapFilename) =>
            set((state) => {
              const mapScale = mapFile.getCrs().scale;
              return {
                ...state,
                mapScale,
                mapFilename,
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
                const control = Control.create(options);
                Event.addControl(draft, control);
                if (courseId) {
                  const draftCourse = findCourse(draft, courseId);
                  draftCourse.controls.push(Control.clone(control));
                  const allControls = findAllControls(draft);
                  allControls.controls.push(Control.clone(control));
                }
              })
            ),
          newEvent: () =>
            set((state) => ({ ...state, ...createNewEvent(state) })),
        },
        course: {
          new: (course) =>
            set(
              undoable((draft) => {
                Event.addCourse(draft, course);
                draft.selectedCourseId = course.id;
              })
            ),
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
          setPrintScale: (courseId, scale) =>
            set(
              undoable((draft) => {
                const draftCourse = findCourse(draft, courseId);
                draftCourse.printScale = scale;
              })
            ),
          setPrintArea: (courseId, printAreaProps) =>
            set(
              undoable((draft) => {
                const draftCourse = findCourse(draft, courseId);
                Object.keys(printAreaProps).forEach((prop) => {
                  draftCourse.printArea[prop] = printAreaProps[prop];
                });
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
                Event.updateControl(draft, controlId, (control) => {
                  control.coordinates = coordinates;
                });
              })
            ),
          setDescription: (controlId, description) =>
            set(
              undoable((draft) => {
                Event.updateControl(draft, controlId, (control) => {
                  control.description = description;
                });
              })
            ),
        },
      },
      undo: () => set(undo),
      redo: () => set(redo),
    }),
    {
      name: "o-scout-event",
      blacklist: ["actions"],
      deserialize: (str) => {
        const storage = JSON.parse(str);
        storage.state = Event.load(storage.state);
        storage.state.isRestored = true;
        return storage;
      },
    }
  )
);

function findCourse(event, courseId) {
  const course = event.courses.find((c) => c.id === courseId);
  if (course) {
    return course;
  } else {
    throw new Error(`Can't find course with id ${courseId}`);
  }
}

function findAllControls(event) {
  return event.courses.find((c) => c.id === "all-controls");
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

function createNewEvent(state) {
  const scale = state?.mapScale || 15000;
  const event = Event.create("New event");

  Event.addCourse(
    event,
    Course.create(event.idGenerator.next(), "New course", [], scale, "normal")
  );
  Event.addCourse(
    event,
    Course.create("all-controls", "All Controls", [], scale, "all-controls", {
      labelKind: "code",
    })
  );

  return event;
}
