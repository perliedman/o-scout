import { MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import shallow from "zustand/shallow";
import useSpecialObjects from "../services/use-special-objects";
import useEvent, { MapState, StateWithActions, useMap } from "../store";
import GeoJSON from "ol/format/GeoJSON";
import { ppenProjection } from "../services/ppen";
import Select from "ol/interaction/Select";
import { Collection, Feature, Map } from "ol";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import type { Course as CourseType } from "../models/course";
import * as Course from "../models/course";
import Fill from "ol/style/Fill";
import { asArray } from "ol/color";
import Modify from "ol/interaction/Modify";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { SpecialObject } from "../models/special-object";
import ExtentInteraction from "../ol/ExtentInteraction";
import { Projection, transform, transformExtent } from "ol/proj";
import { Extent, getCenter, getHeight, getWidth } from "ol/extent";
import ToolButton, { ModeButton } from "../ui/ToolButton";
import { Coordinate } from "ol/coordinate";
import Draw from "ol/interaction/Draw";
import { Polygon } from "ol/geom";
import { overprintLineWidth } from "../services/use-number-positions";
import { MapInfoBox } from "../MapComponent";
import { capitalize } from "lodash";
import Button from "../ui/Button";
import { getControlDescriptionExtent } from "../services/create-svg";

type ObjectMode = "edit" | "white-out" | "line" | "descriptions";

const modes: Array<[ObjectMode, string]> = [
  ["edit", "Edit"],
  ["white-out", "White-Out"],
  ["line", "Line"],
  ["descriptions", "Descriptions"],
];

export default function Objects(): JSX.Element {
  const { map, mapScale } = useMap(getMap);
  const {
    selectedCourse,
    addSpecialObject,
    updateSpecialObject,
    deleteSpecialObject,
    removeSpecialObject,
  } = useEvent(getEvent, shallow);
  const [selectedObjectId, setSelectedObjectId] = useState<number>();
  const [mode, setMode] = useState<ObjectMode>("edit");

  useEffect(() => {
    if (!map || !selectedCourse || mode === "edit") return;
    if (mode === "descriptions") {
      const interaction = new ExtentInteraction({
        create: true,
        boxStyle: selectedStyle,
        cursor: "crosshair",
      });
      interaction.on("extentchangeend", ({ extent }: { extent: Extent }) => {
        if (extent) {
          const locations = mapExtentToDescriptionLocations(
            extent,
            map.getView().getProjection(),
            (selectedCourse?.controls.length || 0) + 2
          );
          addSpecialObject(
            {
              kind: "descriptions",
              locations,
              isAllCourses: false,
            },
            selectedCourse.id
          );
          const objects = useEvent.getState().specialObjects;
          setSelectedObjectId(objects[objects.length - 1].id);
          setMode("edit");
        }
      });
      map.addInteraction(interaction);

      return () => {
        map.removeInteraction(interaction);
      };
    } else {
      const geometryType = mode === "line" ? "LineString" : "Polygon";
      const interaction = new Draw({
        type: geometryType,
        style: selectedStyle,
      });
      interaction.on("drawend", (e) => {
        const coordinates = (
          e.feature.getGeometry() as Polygon
        ).getCoordinates();
        const corners = (
          geometryType === "Polygon" ? coordinates[0] : coordinates
        ) as Coordinate[];
        addSpecialObject(
          {
            kind: mode,
            locations: corners.map((c) =>
              transform(c, map.getView().getProjection(), ppenProjection)
            ),
            isAllCourses: false,
            ...(mode === "line"
              ? { lineWidth: overprintLineWidth, color: "purple" }
              : null),
          },
          selectedCourse.id
        );
        const objects = useEvent.getState().specialObjects;
        setSelectedObjectId(objects[objects.length - 1].id);
        setMode("edit");
      });
      map.addInteraction(interaction);
      return () => {
        map.removeInteraction(interaction);
      };
    }
  }, [addSpecialObject, map, mode, selectedCourse]);

  return (
    <>
      <div className="flex items-start">
        {modes.map(([buttonMode, label]) => (
          <ModeButton
            key={buttonMode}
            active={buttonMode === mode}
            onClick={() => setMode(buttonMode)}
          >
            {label}
          </ModeButton>
        ))}
        {mode === "edit" && (
          <EditObjects
            map={map}
            mapScale={mapScale}
            selectedCourse={selectedCourse}
            selectedObjectId={selectedObjectId}
            setSelectedObjectId={setSelectedObjectId}
            updateSpecialObject={updateSpecialObject}
            deleteSpecialObject={deleteSpecialObject}
            removeSpecialObject={removeSpecialObject}
          />
        )}
      </div>
    </>
  );
}

type EditObjectsProps = {
  map?: Map;
  mapScale?: number;
  selectedCourse?: CourseType;
  selectedObjectId?: number;
  setSelectedObjectId: (objectId: number | undefined) => void;
  updateSpecialObject: (
    objectId: number,
    update: Partial<SpecialObject>
  ) => void;
  deleteSpecialObject: (objectId: number) => void;
  removeSpecialObject: (courseId: number, objectId: number) => void;
};

function EditObjects({
  map,
  mapScale,
  selectedCourse,
  selectedObjectId,
  setSelectedObjectId,
  updateSpecialObject,
  deleteSpecialObject,
  removeSpecialObject,
}: EditObjectsProps): JSX.Element {
  const specialObjectsGeoJSON = useSpecialObjects(
    selectedCourse?.specialObjects || [],
    selectedCourse?.controls.length || 0
  );
  const objectFeatures = useMemo(() => {
    const geojson = new GeoJSON();
    return geojson.readFeatures(specialObjectsGeoJSON, {
      dataProjection: ppenProjection,
      featureProjection: map?.getView().getProjection(),
    });
  }, [specialObjectsGeoJSON, map]);

  const selectedObjectRef = useRef<SpecialObject | undefined>();
  selectedObjectRef.current = selectedCourse?.specialObjects.find(
    (object) => object.id === selectedObjectId
  );

  const [select, layer] = useMemo(() => {
    if (map) {
      const layer = new VectorLayer({
        source: new VectorSource({ features: objectFeatures }),
        zIndex: 20,
      });

      const selectedFeature = objectFeatures.find(
        (feature) => feature.getId() === selectedObjectId
      );
      const select = new Select({
        layers: [layer],
        style: selectedStyle,
        features: selectedFeature && new Collection([selectedFeature]),
      });
      select.on("select", (e) => {
        const featureId = e.selected[0]?.getId() as number | undefined;
        setSelectedObjectId(featureId);
      });

      return [select, layer];
    }
    return [undefined, undefined];
  }, [map, objectFeatures, selectedObjectId]);

  useEffect(() => {
    if (select && map && layer) {
      map.addLayer(layer);
      map.addInteraction(select);
      return () => {
        map.removeInteraction(select);
        map.removeLayer(layer);
      };
    }
  }, [map, select, layer]);

  useEffect(() => {
    if (!map || !select) return;
    const selectedFeature = objectFeatures.find(
      (feature) => feature.getId() === selectedObjectId
    );

    if (selectedFeature?.get("kind") === "descriptions") {
      const extentInteraction = new ExtentInteraction({
        extent: selectedFeature.getGeometry()?.getExtent(),
        pointerStyle: new Style(),
        boxStyle: selectedStyle,
      });
      extentInteraction.on("extentchangeend", (e: { extent: Extent }) => {
        updateSpecialObject(selectedObjectId as number, {
          locations: mapExtentToDescriptionLocations(
            e.extent,
            map.getView().getProjection(),
            (selectedCourse?.controls.length || 0) + 2
          ),
        });
      });
      map.addInteraction(extentInteraction);
      return () => {
        map.removeInteraction(extentInteraction);
      };
    } else {
      const modify = new Modify({
        features: select.getFeatures(),
      });
      modify.on("modifyend", (e) => {
        const feature = e.features.getArray()[0] as Feature;
        const geometry = feature.getGeometry();
        const specialObject = selectedCourse?.specialObjects.find(
          (object) => object.id === feature.getId()
        );
        if (specialObject && geometry) {
          const objectGeoJSON = new GeoJSON().writeGeometryObject(geometry, {
            featureProjection: map.getView().getProjection(),
            dataProjection: ppenProjection,
          }) as any;
          let locations: Coordinate[];

          if (objectGeoJSON.type === "Polygon") {
            const outerRing = objectGeoJSON.coordinates[0];
            locations = outerRing.slice(0, outerRing.length - 1);
          } else if (objectGeoJSON.type === "LineString") {
            locations = objectGeoJSON.coordinates;
          } else {
            throw new Error(`Unhandled geometry type ${objectGeoJSON.type}.`);
          }
          updateSpecialObject(feature.getId() as number, {
            locations,
          });
        }
      });
      map.addInteraction(modify);
      return () => {
        map.removeInteraction(modify);
      };
    }
  }, [
    map,
    objectFeatures,
    selectedCourse,
    updateSpecialObject,
    select,
    selectedObjectId,
  ]);

  return (
    <>
      <ToolButton disabled={selectedObjectId === undefined} onClick={onDelete}>
        Delete
      </ToolButton>
      {selectedObjectId && selectedObjectRef.current ? (
        <MapInfoBox>
          <ObjectProperties
            object={selectedObjectRef.current}
            selectedCourse={selectedCourse}
            mapScale={mapScale}
            updateObject={(update) =>
              updateSpecialObject(selectedObjectId, update)
            }
          />
        </MapInfoBox>
      ) : null}
    </>
  );

  function onDelete(e: MouseEvent) {
    if (selectedObjectId) {
      if (e.shiftKey) {
        deleteSpecialObject(selectedObjectId);
      } else if (selectedCourse) {
        removeSpecialObject(selectedCourse.id, selectedObjectId);
      }
      setSelectedObjectId(undefined);
    }
  }
}

function getMap({ map, mapFile }: MapState) {
  return { map, mapScale: mapFile?.getCrs().scale };
}

function getEvent({
  selectedCourseId,
  courses,
  actions: {
    event: { addSpecialObject, updateSpecialObject, deleteSpecialObject },
    course: { removeSpecialObject },
  },
}: StateWithActions) {
  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId
  );
  return {
    selectedCourseId,
    selectedCourse,
    addSpecialObject,
    updateSpecialObject,
    deleteSpecialObject,
    removeSpecialObject,
  };
}

function mapExtentToDescriptionLocations(
  projectedExtent: Extent,
  mapProjection: Projection,
  numberRows: number
): Coordinate[] {
  const extent = transformExtent(
    projectedExtent,
    mapProjection,
    ppenProjection
  );
  const width = extent[2] - extent[0];
  const height = extent[3] - extent[1];
  const cellSize = Math.max(width / 8, height / numberRows);

  return [
    [extent[0], extent[3]],
    [extent[0] + cellSize, extent[3]],
  ];
}

const fillColor = asArray(Course.selectedOverPrintRgb);
fillColor[3] = 0.25;

const selectedStyle = new Style({
  stroke: new Stroke({ width: 2, color: Course.selectedOverPrintRgb }),
  fill: new Fill({ color: fillColor }),
  zIndex: 1000,
});

type ObjectPropertiesProps = {
  object: SpecialObject;
  mapScale?: number;
  selectedCourse?: CourseType;
  updateObject: (update: Partial<SpecialObject>) => void;
};

function ObjectProperties(props: ObjectPropertiesProps) {
  const { object, updateObject } = props;
  return (
    <>
      {capitalize(object.kind)}
      <div className="flex gap-x-2 items-center">
        <input
          type="checkbox"
          id="use-on-all-courses"
          checked={object.isAllCourses}
          onChange={(e) => updateObject({ isAllCourses: e.target.checked })}
        />
        <label htmlFor="use-on-all-courses">Use on all courses</label>
      </div>
      {object.kind === "descriptions" ? (
        <DescriptionProperties {...props} />
      ) : null}
    </>
  );
}

function DescriptionProperties({
  object,
  selectedCourse,
  mapScale,
  updateObject,
}: ObjectPropertiesProps) {
  const cellSize = object.locations[1][0] - object.locations[0][0];
  const rows = (selectedCourse?.controls.length || 0) + 2;
  const extent = getControlDescriptionExtent(object, rows);
  const scaleFactor =
    selectedCourse && mapScale ? mapScale / selectedCourse.printScale : 1;
  return (
    <>
      <div className="flex justify-between gap-x-2">
        <div>Cell size: {(cellSize * scaleFactor).toFixed(1)} mm</div>
        <Button
          size="small"
          onClick={() => {
            const center = getCenter(extent);
            const cellSize = 5 / scaleFactor;
            const width = cellSize * 8;
            const height = cellSize * rows;
            updateObject({
              locations: [
                [center[0] - width / 2, center[1] + height / 2],
                [center[0] - width / 2 + cellSize, center[1] + height / 2],
              ],
            });
          }}
        >
          Set standard
        </Button>
      </div>
      <div>
        Dimensions: {(getWidth(extent) * scaleFactor).toFixed(1)} &times;{" "}
        {(getHeight(extent) * scaleFactor).toFixed(1)} mm
      </div>
    </>
  );
}
