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
import OcadTiler, { SvgOptions } from "ocad-tiler";
import VectorSource from "ol/source/Vector";
import { Coordinate } from "ol/coordinate";
import Projection from "ol/proj/Projection";
import { fromProjectedCoord, toProjectedCoord } from "./services/coordinates";
import { addCoordinateTransforms, ProjectionLike } from "ol/proj";
import { ppenProjection } from "./services/ppen";
// eslint-disable-next-line import/no-webpack-loader-syntax
import TileWorker from "worker-loader!./tile.worker.js";
import { SpecialObject } from "./models/special-object";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";

enablePatches();

export interface OcadCrs {
  name: string;
  scale: number;
  catalog: string;
  code: number;
  easting: number;
  northing: number;
  toProjectedCoord: (c: Coordinate) => Coordinate;
  toMapCoord: (c: Coordinate) => Coordinate;
}

export interface OcadFile {
  header: {
    version: number;
    subVersion: number;
    subSubVersion: number;
    currentFileVersion: number;
  };
  warnings: string[];
  colors: Color[];
  getCrs: () => OcadCrs;
}

export type Color = {
  rgbArray: [number, number, number];
  cmyk?: [number, number, number, number];
};

export interface MapProvider {
  mapName: string;
  getCrs: () => OcadCrs;
  getExtent: () => Extent;
  getColors: () => Color[];
  getOlProjection: () => Promise<ProjectionLike>;
  paperToProjected: (c: Coordinate) => Coordinate;
  projectedToPaper: (c: Coordinate) => Coordinate;
  createTileLayer: (props: {
    onError: (err: unknown) => void;
    onSuccess: () => void;
  }) => Promise<TileLayer<XYZ>>;
  renderSvg: (extent: Extent, svgOptions: SvgOptions) => Promise<XMLDocument>;
  close: () => void;
}

export interface MapState {
  mapProvider?: MapProvider;
  map?: Map;
  clipGeometry?: Geometry;
  clipLayer?: VectorLayer<VectorSource>;
  controlsSource?: VectorSource;
  tileWorker?: TileWorker;
  setMapProvider: (mapProvider: MapProvider) => void;
  setMapInstance: (map: Map) => void;
  setClipGeometry: (geometry: Geometry) => void;
  setClipLayer: (clipLayer: VectorLayer<VectorSource>) => void;
  setControlsSource: (controlSource: VectorSource) => void;
}

export const useMap = create<MapState>((set) => ({
  mapProvider: undefined,
  mapInstance: undefined,
  clipGeometry: undefined,
  clipLayer: undefined,
  setMapProvider: (mapProvider) => set({ mapProvider }),
  setMapInstance: (map) =>
    set((state) => {
      const crs = state.mapProvider?.getCrs();
      const mapProjection = map.getView().getProjection();
      const paperToProjected = (c: Coordinate) => toProjectedCoord(crs, c);
      const projectedToPaper = (c: Coordinate) => fromProjectedCoord(crs, c);
      addCoordinateTransforms(
        ppenProjection,
        mapProjection,
        paperToProjected,
        projectedToPaper
      );

      return { map };
    }),
  setClipGeometry: (clipGeometry) =>
    set((state) => ({ ...state, clipGeometry })),
  setClipLayer: (clipLayer) => set((state) => ({ ...state, clipLayer })),
  setControlsSource: (controlsSource) =>
    set((state) => ({ ...state, controlsSource })),
}));

export function useCrs(): OcadCrs | undefined {
  const mapProvider = useMap(getMapProvider);
  return useMemo(() => mapProvider?.getCrs(), [mapProvider]);
}

function getMapProvider({ mapProvider }: MapState) {
  return mapProvider;
}

export enum Mode {
  CreateCourse = 1,
  EditControls = 2,
  PrintArea = 3,
  Objects = 4,
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
      setMapProvider: (mapProvider: MapProvider) => void;
      setName: (name: string) => void;
      addControl: (
        options: Event.ControlCreationOptions,
        courseId?: number,
        beforeId?: number
      ) => void;
      newEvent: () => void;
      addSpecialObject: (
        specialObject: Omit<SpecialObject, "id">,
        courseId: number
      ) => void;
      updateSpecialObject: (
        objectId: number,
        update: Partial<SpecialObject>
      ) => void;
      deleteSpecialObject: (objectId: number) => void;
    };
    course: {
      new: (course: CourseType) => void;
      setSelected: (selectedCourseId: number) => void;
      setName: (courseId: number, name: string) => void;
      setPrintAreaExtent: (courseId: number, extent: Extent) => void;
      setPrintScale: (courseId: number, scale: number) => void;
      setPrintArea: (courseId: number, props: PrintArea) => void;
      replaceControl: (
        courseId: number,
        controlIndex: number,
        newControlId: number
      ) => void;
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
      setCode: (controlId: number, code: number) => void;
    };
    setMode: (mode: Mode) => void;
  };
  undo: () => void;
  redo: () => void;
}

interface UiState {
  selectedCourseId: number;
  mode: Mode;
}

export type EventState = EventType & UiState;
export type StateWithActions = EventState & Actions;

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
              mode: event.courses?.[0]
                ? getModeFromCourse(event.courses[0])
                : Mode.CreateCourse,
            })),
          setMapProvider: (mapProvider) =>
            set((state) =>
              produce(state, (draft) =>
                Event.setMap(
                  draft,
                  mapProvider.getCrs().scale,
                  mapProvider.mapName
                )
              )
            ),
          setName: (name) =>
            set(
              undoable((draft: StateWithActions) => {
                draft.name = name;
              })
            ),
          addControl: (options, courseId, beforeId) =>
            set(
              undoable((draft: StateWithActions) => {
                const control = Event.addControl(draft, options);
                if (courseId && courseId !== Event.ALL_CONTROLS_ID) {
                  const draftCourse = findCourse(draft, courseId);
                  if (beforeId == null) {
                    draftCourse.controls.push(Control.clone(control));
                  } else {
                    const beforeIndex = draftCourse.controls.findIndex(
                      (c) => c.id === beforeId
                    );
                    if (beforeIndex < 0)
                      throw new Error(
                        `Course has no control with id ${beforeId}.`
                      );
                    draftCourse.controls.splice(
                      beforeIndex,
                      0,
                      Control.clone(control)
                    );
                  }
                  if (
                    courseId === draft.selectedCourseId &&
                    control.kind === "finish"
                  ) {
                    draft.mode = Mode.EditControls;
                  }
                }
              })
            ),
          newEvent: () => set((state) => createNewEvent(state)),
          addSpecialObject: (specialObject, courseId) =>
            set(
              undoable((draft) => {
                Event.addSpecialObject(draft, specialObject, courseId);
              })
            ),
          updateSpecialObject: (objectId, update) =>
            set(
              undoable((draft) => {
                const objectIndex = draft.specialObjects.findIndex(
                  (object) => object.id === objectId
                );
                if (objectIndex < 0) {
                  throw new Error(`No special object with id ${objectId}.`);
                }
                const updatedObject = {
                  ...draft.specialObjects[objectIndex],
                  ...update,
                };
                draft.specialObjects[objectIndex] = updatedObject;
                for (const course of draft.courses) {
                  for (let i = 0; i < course.specialObjects.length; i++) {
                    if (course.specialObjects[i].id === objectId) {
                      course.specialObjects[i] = {
                        ...updatedObject,
                        locations: [...updatedObject.locations],
                      };
                    }
                  }
                }
              })
            ),
          deleteSpecialObject: (objectId) =>
            set(
              undoable((draft) => {
                const objectIndex = draft.specialObjects.findIndex(
                  (object) => object.id === objectId
                );
                if (objectIndex < 0) {
                  throw new Error(`No special object with id ${objectId}.`);
                }
                draft.specialObjects.splice(objectIndex, 1);

                for (const course of draft.courses) {
                  for (let i = 0; i < course.specialObjects.length; i++) {
                    if (course.specialObjects[i].id === objectId) {
                      course.specialObjects.splice(i, 1);
                      break;
                    }
                  }
                }
              })
            ),
        },
        course: {
          new: (course) =>
            set(
              undoable((draft: StateWithActions) => {
                Event.addCourse(draft, course);
                draft.selectedCourseId = course.id;
              })
            ),
          setSelected: (selectedCourseId) =>
            set((state) => {
              let course;

              try {
                course = findCourse(state, selectedCourseId);
              } catch (e) {
                // Course not found, let mode be what it was
              }
              const mode =
                course &&
                (state.mode === Mode.CreateCourse ||
                  state.mode === Mode.EditControls)
                  ? getModeFromCourse(course)
                  : state.mode;
              return { selectedCourseId, mode };
            }),
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
                const draftCourse = findCourse(draft, courseId);
                const originalPrintScale = draftCourse.printScale;
                draftCourse.printScale = scale;

                if (courseId !== Event.ALL_CONTROLS_ID) {
                  const allControls = Event.getAllControls(draft);
                  if (allControls.printScale === originalPrintScale) {
                    allControls.printScale = scale;
                  }
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
          replaceControl: (courseId, controlIndex, newControlId) =>
            set(
              undoable((draft: StateWithActions) => {
                const draftCourse = findCourse(draft, courseId);
                const newControl = draft.controls[newControlId];
                draftCourse.controls.splice(controlIndex, 1, newControl);
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
          setCode: (controlId, code) =>
            set(
              undoable((draft: StateWithActions) => {
                Event.updateControl(draft, controlId, (control) => {
                  control.code = code;
                });
              })
            ),
        },
        setMode: (mode) => set(() => ({ mode })),
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

  return {
    ...event,
    selectedCourseId: event.courses[0].id,
    mode: Mode.CreateCourse,
  };
}

function getModeFromCourse(course: CourseType): Mode {
  return course.controls.some((c: ControlType) => c.kind === "finish")
    ? Mode.EditControls
    : Mode.CreateCourse;
}
