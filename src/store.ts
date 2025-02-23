import create from "zustand";
import { persist } from "zustand/middleware";
import produce, { applyPatches, enablePatches, Patch } from "immer";
import * as Event from "./models/event";
import { Event as EventType } from "./models/event";
import * as Control from "./models/control";
import { Control as ControlType } from "./models/control";
import * as Course from "./models/course";
import { Course as CourseType } from "./models/course";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Map } from "ol";
import Geometry from "ol/geom/Geometry";
import VectorLayer from "ol/layer/Vector";
import { Extent, getHeight, getWidth } from "ol/extent";
import { PrintArea } from "./models/print-area";
import OcadTiler from "ocad-tiler";
import VectorSource from "ol/source/Vector";
import { Coordinate } from "ol/coordinate";
import Projection from "ol/proj/Projection";
import { fromProjectedCoord, toProjectedCoord } from "./services/coordinates";
import { addCoordinateTransforms } from "ol/proj";
import { ppenProjection } from "./services/ppen";
// eslint-disable-next-line import/no-webpack-loader-syntax
import TileWorker from "./tile.worker.js?worker";
import { SpecialObject } from "./models/special-object";
import { readMap } from "./services/map";

enablePatches();

export interface OcadCrs {
  scale: number;
  catalog: string;
  code: number;
  toProjectedCoord: (c: Coordinate) => Coordinate;
  fromProjectedCoord: (c: Coordinate) => Coordinate;
}

interface OcadFile {
  getCrs: () => OcadCrs;
}

export interface MapState {
  mapFile?: OcadFile;
  map?: Map;
  clipGeometry?: Geometry;
  clipLayer?: VectorLayer<VectorSource>;
  controlsSource?: VectorSource;
  projections?: {
    mapProjection: Projection;
    paperToProjected: (c: Coordinate) => Coordinate;
    projectedToPaper: (c: Coordinate) => Coordinate;
  };
  tileWorker?: TileWorker;
  setMapFile: (
    mapFilename: string,
    mapFile: OcadFile,
    tiler: OcadTiler,
    mapFileBlob: Blob
  ) => void;
  setMapInstance: (map: Map) => void;
  setClipGeometry: (geometry: Geometry) => void;
  setClipLayer: (clipLayer: VectorLayer<VectorSource>) => void;
  setControlsSource: (controlSource: VectorSource) => void;
}

const mapMetadataKey = "mapMetadata";
const mapBlobKey = "ocadMap";

type MapMetadata = { mapFilename: string };

export const useMap = create<MapState>((set) => ({
  mapFile: undefined,
  mapInstance: undefined,
  clipGeometry: undefined,
  clipLayer: undefined,
  projections: undefined,
  setMapFile: async (mapFilename, mapFile, tiler, mapFileBlob) =>
    await new Promise((resolve, reject) => {
      const tileWorker = new TileWorker();
      tileWorker.onmessage = (message: any) => {
        if (message.data.type === "READY") {
          set((state) => {
            if (state.tileWorker) {
              state.tileWorker.terminate();
            }
            return {
              ...state,
              mapFile,
              mapFilename,
              tiler,
              tileWorker,
              projections: undefined,
            };
          });
          resolve();
        } else {
          reject(new Error(`Unexpected message: ${message.data.type}.`));
        }
      };
      tileWorker.postMessage({ type: "SET_MAP_FILE", blob: mapFileBlob });
      const reader = new FileReader();
      reader.readAsDataURL(mapFileBlob);
      reader.onloadend = () => {
        try {
          localStorage.setItem(
            mapMetadataKey,
            JSON.stringify({ mapFilename } satisfies MapMetadata)
          );
          localStorage.setItem(mapBlobKey, reader.result as string);
        } catch (e) {
          // Storage failed, likely because data is too large,
          // clear any data we have there to avoid corrupt state when app is
          // reloaded
          console.error(e);
          localStorage.removeItem(mapMetadataKey);
          localStorage.removeItem(mapBlobKey);
        }
      };
    }),
  setMapInstance: (map) =>
    set((state) => {
      const crs = state.mapFile?.getCrs();
      let projections;
      if (map) {
        if (!crs) throw new Error("Setting map instance without a map file.");

        const mapProjection = map.getView().getProjection();
        const paperToProjected = (c: Coordinate) => toProjectedCoord(crs, c);
        const projectedToPaper = (c: Coordinate) => fromProjectedCoord(crs, c);
        projections = {
          mapProjection,
          paperToProjected,
          projectedToPaper,
        };
        addCoordinateTransforms(
          ppenProjection,
          mapProjection,
          paperToProjected,
          projectedToPaper
        );
      }

      return {
        ...state,
        map,
        projections,
      };
    }),
  setClipGeometry: (clipGeometry) =>
    set((state) => ({ ...state, clipGeometry })),
  setClipLayer: (clipLayer) => set((state) => ({ ...state, clipLayer })),
  setControlsSource: (controlsSource) =>
    set((state) => ({ ...state, controlsSource })),
}));

export function useCrs(): OcadCrs | undefined {
  const mapFile = useMap(getMapFile);
  return useMemo(() => mapFile?.getCrs(), [mapFile]);
}

export function useSavedMap() {
  const [done, setDone] = useState(false);
  const setMapFile = useMap(({ setMapFile }) => setMapFile);
  useEffect(() => {
    load();
    async function load() {
      try {
        const storedMap = localStorage.getItem(mapBlobKey);
        const metadata = localStorage.getItem(mapMetadataKey);
        if (storedMap && metadata) {
          const res = await fetch(storedMap);
          const blob = await res.blob();
          const mapFile = await readMap(blob);
          setMapFile(
            (JSON.parse(metadata) as MapMetadata).mapFilename,
            mapFile,
            new OcadTiler(mapFile),
            blob
          );
        }
      } finally {
        setDone(true);
      }
    }
    // We only want to run this once, on startup, no matter if deps change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return done;
}

function getMapFile({ mapFile }: MapState) {
  return mapFile;
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
      setMap: (mapFile: OcadFile, mapFilename: string) => void;
      setName: (name: string) => void;
      addControl: (
        options: Event.ControlCreationOptions,
        courseId?: number,
        beforeId?: number
      ) => void;
      deleteControl: (controlId: number) => void;
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
      removeSpecialObject: (courseId: number, specialObjectId: number) => void;
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
          deleteControl: (controlId) =>
            set(
              undoable((draft: StateWithActions) => {
                Event.deleteControl(draft, controlId);
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
                  let found = false;
                  for (let i = 0; i < course.specialObjects.length; i++) {
                    if (course.specialObjects[i].id === objectId) {
                      course.specialObjects[i] = {
                        ...updatedObject,
                        locations: [...updatedObject.locations],
                      };
                      found = true;
                      break;
                    }
                  }

                  if (!found && updatedObject.isAllCourses) {
                    course.specialObjects.push({ ...updatedObject });
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
          removeSpecialObject: (courseId, specialObjectId) =>
            set(
              undoable((draft: StateWithActions) => {
                const draftCourse = findCourse(draft, courseId);
                const specialObjectIndex = draftCourse.specialObjects.findIndex(
                  (o) => o.id === specialObjectId
                );
                if (specialObjectIndex >= 0) {
                  draftCourse.specialObjects.splice(specialObjectIndex, 1);
                }
                let isUsedOnOtherCourse = false;
                for (const course of draft.courses) {
                  for (const object of course.specialObjects) {
                    if (object.id === specialObjectId) {
                      object.isAllCourses = false;
                      isUsedOnOtherCourse = true;
                    }
                  }
                }

                if (!isUsedOnOtherCourse) {
                  draft.specialObjects.splice(
                    draft.specialObjects.findIndex(
                      (o) => o.id === specialObjectId
                    ),
                    1
                  );
                } else {
                  for (const object of draft.specialObjects) {
                    if (object.id === specialObjectId) {
                      object.isAllCourses = false;
                    }
                  }
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
    Course.create(event.idGenerator.next(), "Course 1", [], scale, "normal")
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
