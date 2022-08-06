import { useEffect, useMemo, useRef, useState } from "react";
import shallow from "zustand/shallow";
import useSpecialObjects from "../services/use-special-objects";
import useEvent, { MapState, StateWithActions, useMap } from "../store";
import GeoJSON from "ol/format/GeoJSON";
import { ppenProjection } from "../services/ppen";
import Select from "ol/interaction/Select";
import { Collection, Feature } from "ol";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import { selectedOverPrintRgb } from "../models/course";
import Fill from "ol/style/Fill";
import { asArray } from "ol/color";
import Modify from "ol/interaction/Modify";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { SpecialObject } from "../models/special-object";
import { altKeyOnly, singleClick } from "ol/events/condition";
import ExtentInteraction from "../ol/ExtentInteraction";
import { transformExtent } from "ol/proj";
import { Extent } from "ol/extent";
import ToolButton, { ModeButton } from "../ui/ToolButton";

export default function Objects(): JSX.Element {
  return (
    <>
      <div className="flex items-start">
        <ModeButton active>Edit</ModeButton>
        <ModeButton>White-out</ModeButton>
        <ModeButton>Line</ModeButton>
        <ModeButton>Descriptions</ModeButton>
        <EditObjects />
      </div>
    </>
  );
}

function EditObjects(): JSX.Element {
  const { map } = useMap(getMap);
  const { selectedCourse, updateSpecialObject, deleteSpecialObject } = useEvent(
    getEvent,
    shallow
  );

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

  const [selectedObjectId, setSelectedObjectId] = useState<number>();
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
        const { extent: projectedExtent } = e;
        const extent = transformExtent(
          projectedExtent,
          map.getView().getProjection(),
          ppenProjection
        );
        const width = extent[2] - extent[0];
        const height = extent[3] - extent[1];
        const cellSize = Math.max(
          width / 8,
          height / ((selectedCourse?.controls.length || 0) + 2)
        );
        updateSpecialObject(selectedObjectId as number, {
          locations: [
            [extent[0], extent[3]],
            [extent[0] + cellSize, extent[3]],
          ],
        });
      });
      map.addInteraction(extentInteraction);
      return () => {
        map.removeInteraction(extentInteraction);
      };
    } else {
      const modify = new Modify({
        features: select.getFeatures(),
        condition: () => {
          return selectedObjectRef.current?.kind !== "descriptions";
        },
        insertVertexCondition: () => {
          return selectedObjectRef.current?.kind !== "descriptions";
        },
        deleteCondition: (e) => {
          return (
            selectedObjectRef.current?.kind !== "descriptions" &&
            singleClick(e) &&
            altKeyOnly(e)
          );
        },
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
          if (specialObject.kind !== "descriptions") {
            const outerRing = objectGeoJSON.coordinates[0];
            updateSpecialObject(feature.getId() as number, {
              locations: outerRing.slice(0, outerRing.length - 1),
            });
          } else {
          }
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
    <ToolButton disabled={selectedObjectId === undefined} onClick={onDelete}>
      Delete
    </ToolButton>
  );

  function onDelete() {
    if (selectedObjectId) {
      deleteSpecialObject(selectedObjectId);
      setSelectedObjectId(undefined);
    }
  }
}

function getMap({ map }: MapState) {
  return { map };
}

function getEvent({
  selectedCourseId,
  courses,
  actions: {
    event: { updateSpecialObject, deleteSpecialObject },
  },
}: StateWithActions) {
  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId
  );
  return {
    selectedCourseId,
    selectedCourse,
    updateSpecialObject,
    deleteSpecialObject,
  };
}

const fillColor = asArray(selectedOverPrintRgb);
fillColor[3] = 0.25;

const selectedStyle = new Style({
  stroke: new Stroke({ width: 2, color: selectedOverPrintRgb }),
  fill: new Fill({ color: fillColor }),
  zIndex: 1000,
});
