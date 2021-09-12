import create from "zustand";
import { persist } from "zustand/middleware";
import produce, { applyPatches, enablePatches, Patch } from "immer";
import * as Event from "./models/event";
import { Event as EventType } from "./models/event";
import * as Control from "./models/control";
import { Control as ControlType } from "./models/control";
import * as Course from "./models/course";
import { Course as CourseType } from "./models/course";
import { ReactNode, useMemo } from "react";
import { Map } from "ol";
import Geometry from "ol/geom/Geometry";
import VectorLayer from "ol/layer/Vector";
import { Extent } from "ol/extent";
import { PrintArea } from "./models/print-area";
import OcadTiler from "ocad-tiler";
import VectorSource from "ol/source/Vector";

enablePatches();

interface Crs {
  scale: number;
}

interface OcadFile {
  getCrs: () => Crs;
}

interface MapState {
  mapFile?: OcadFile;
  mapInstance?: Map;
  clipGeometry?: Geometry;
  clipLayer?: VectorLayer;
  setMapFile: (
    mapFilename: string,
    mapFile: OcadFile,
    tiler: OcadTiler
  ) => void;
  setMapInstance: (map: Map) => void;
  setClipGeometry: (geometry: Geometry) => void;
  setClipLayer: (clipLayer: VectorLayer) => void;
  setControlsSource: (controlSource: VectorSource) => void;
}

export const useMap = create<MapState>((set) => ({
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

export function useCrs(): Crs | undefined {
  const mapFile = useMap(getMapFile);
  return useMemo(() => mapFile?.getCrs(), [mapFile]);
}

function getMapFile({ mapFile }: MapState) {
  return mapFile;
}

type Undoable = {
  undo: Patch[];
  redo: Patch[];
};
const history: Undoable[] = [];
let currentVersion = -1;
const maxHistoryLength = 40;

interface Actions {
  actions: {
    event: {
      set: (event: EventType) => void;
      setMap: (mapFile: OcadFile, mapFilename: string) => void;
      setName: (name: string) => void;
      addControl: (options: ControlType, courseId?: number) => void;
      newEvent: () => void;
    };
    course: {
      new: (course: CourseType) => void;
      setSelected: (selectedCourseId: number) => void;
      setName: (courseId: number, name: string) => void;
      setPrintAreaExtent: (courseId: number, extent: Extent) => void;
      setPrintScale: (courseId: number, scale: number) => void;
      setPrintArea: (courseId: number, props: PrintArea) => void;
    };
    control: {
      remove: (courseId: number, controlId: number) => void;
      setCoordinates: (
        courseId: number,
        controlId: number,
        coordinates: number[]
      ) => void;
      setDescription: (
        controlId: number,
        description: Control.Description
      ) => void;
    };
  };
  undo: () => void;
  redo: () => void;
}

interface UiState {
  selectedCourseId: number;
}

type EventState = EventType & UiState;
type StateWithActions = EventState & Actions;

const useEvent = create<StateWithActions>(
  persist(
    (set) => ({
      ...createNewEvent(),
      actions: {
        event: {
          set: (event) =>
            set(() => ({
              ...event,
              selectedCourseId: event.courses?.[0]?.id,
            })),
          setMap: (mapFile, mapFilename) =>
            set((state) =>
              produce(state, (draft) =>
                Event.setMap(draft, mapFile.getCrs().scale, mapFilename)
              )
            ),
          setName: (name) =>
            set(
              undoable((draft: StateWithActions) => {
                draft.name = name;
              })
            ),
          addControl: (options, courseId) =>
            set(
              undoable((draft: StateWithActions) => {
                const control = Control.create(options);
                Event.addControl(draft, control);
                if (courseId && courseId !== Event.ALL_CONTROLS_ID) {
                  const draftCourse = findCourse(draft, courseId);
                  draftCourse.controls.push(Control.clone(control));
                }
              })
            ),
          newEvent: () => set((state) => createNewEvent(state)),
        },
        course: {
          new: (course) =>
            set(
              undoable((draft: StateWithActions) => {
                Event.addCourse(draft, course);
                draft.selectedCourseId = course.id;
              })
            ),
          setSelected: (selectedCourseId) => set(() => ({ selectedCourseId })),
          setName: (courseId, name) =>
            set(
              undoable((draft: StateWithActions) => {
                const draftCourse = findCourse(draft, courseId);
                draftCourse.name = name;
              })
            ),
          setPrintAreaExtent: (courseId, extent) =>
            set(
              undoable((draft: StateWithActions) => {
                const isAllControls = courseId === Event.ALL_CONTROLS_ID;
                const printArea = isAllControls
                  ? draft.printArea
                  : findCourse(draft, courseId).printArea;
                printArea.auto = false;
                printArea.extent = extent;

                if (isAllControls) {
                  Event.updateAllControls(draft);
                }
              })
            ),
          setPrintScale: (courseId, scale) =>
            set(
              undoable((draft: StateWithActions) => {
                if (courseId !== Event.ALL_CONTROLS_ID) {
                  const draftCourse = findCourse(draft, courseId);
                  draftCourse.printScale = scale;
                }
              })
            ),
          setPrintArea: (courseId, printAreaProps) =>
            set(
              undoable((draft: StateWithActions) => {
                const isAllControls = courseId === Event.ALL_CONTROLS_ID;
                const printArea = findCourse(draft, courseId).printArea;
                const mapTo = <T, S extends T, K extends keyof T>(
                  target: T,
                  source: S,
                  key: K
                ): void => {
                  target[key] = source[key];
                };
                (Object.keys(printAreaProps) as (keyof PrintArea)[]).forEach(
                  (prop) => {
                    mapTo(printArea, printAreaProps, prop);
                  }
                );

                if (isAllControls) {
                  Event.updateAllControls(draft);
                }
              })
            ),
        },
        control: {
          remove: (courseId, controlId) =>
            set(
              undoable((draft: StateWithActions) => {
                const draftCourse = findCourse(draft, courseId);
                const controlIndex = draftCourse.controls.findIndex(
                  ({ id }) => id === controlId
                );
                draftCourse.controls.splice(controlIndex, 1);
              })
            ),
          setCoordinates: (courseId, controlId, coordinates) =>
            set(
              undoable((draft: StateWithActions) => {
                Event.updateControl(draft, controlId, (control) => {
                  control.coordinates = coordinates;
                });
              })
            ),
          setDescription: (controlId, description) =>
            set(
              undoable((draft: StateWithActions) => {
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

function findCourse(event: EventType, courseId: number): CourseType {
  const course = event.courses.find((c) => c.id === courseId);
  if (course) {
    return course;
  } else {
    throw new Error(`Can't find course with id ${courseId}`);
  }
}

export default useEvent;

export const useUndo: () => { undo?: () => void; redo?: () => void } = () =>
  useEvent(getUndoRedo);

function getUndoRedo({ undo, redo }: Actions) {
  return {
    undo: history[currentVersion]?.undo && undo,
    redo: history[currentVersion + 1]?.redo && redo,
  };
}

function undoable(fn: (draft: StateWithActions) => void) {
  return (state: EventState) =>
    produce(state, fn, (patches, inversePatches) => {
      currentVersion++;
      history[currentVersion] = { redo: patches, undo: inversePatches };
      delete history[currentVersion + 1];
      delete history[currentVersion - maxHistoryLength];
    });
}

function undo(state: StateWithActions) {
  if (!history[currentVersion]?.undo) return;
  return applyPatches(state, history[currentVersion--].undo);
}

function redo(state: StateWithActions) {
  if (!history[currentVersion + 1]?.redo) return;
  return applyPatches(state, history[++currentVersion].redo);
}

interface Notification {
  type: string;
  message: ReactNode;
  detail?: ReactNode;
}

interface NotificationsState {
  notifications: Notification[];
  push: (type: string, message: ReactNode, detail?: ReactNode) => void;
  pop: () => void;
}

export const useNotifications = create<NotificationsState>((set) => ({
  notifications: [],
  push: (type, message, detail) =>
    set((state) => ({
      notifications: [...state.notifications, { type, message, detail }],
    })),
  pop: () => set((state) => ({ notifications: state.notifications.slice(1) })),
}));

function createNewEvent(state?: EventState): EventState {
  const scale = state?.mapScale || 15000;
  const event = Event.create("New event");

  Event.setMap(event, scale, state?.mapFilename || "");

  Event.addCourse(
    event,
    Course.create(event.idGenerator.next(), "New course", [], scale, "normal")
  );

  return { ...event, selectedCourseId: event.courses[0].id };
}
