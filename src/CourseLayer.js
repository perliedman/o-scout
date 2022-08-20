import { useEffect, useMemo, useRef } from "react";
import { useCrs, useMap } from "./store";
import GeoJSON from "ol/format/GeoJSON";
import useControls from "./services/use-controls";
import useControlConnections from "./services/user-control-connections";
import useSpecialObjects from "./services/use-special-objects";
import useNumberPositions, {
  courseObjectsGeoJSON,
} from "./services/use-number-positions";
import { useControlDescriptions } from "./ControlDescriptionLayer";
import { featureCollection } from "@turf/helpers";
import { fromExtent as polygonFromExtent } from "ol/geom/Polygon";
import { getObjectScale, transformExtent } from "./services/coordinates";
import { Feature } from "ol";
import useVector from "./ol/use-vector";
import useStyle from "./course-feature-style";
import { ppenProjection } from "./services/ppen";
import { getPrintAreaExtent } from "./models/course";

export default function CourseLayer({ eventName, course, courseAppearance }) {
  const {
    map,
    mapFile,
    clipLayer,
    setControlsSource,
    projections: { paperToProjected },
  } = useMap(getMap);
  const crs = useCrs();
  const mapProjection = useMemo(() => map?.getView().getProjection(), [map]);

  const mapScale = useMemo(() => mapFile.getCrs().scale, [mapFile]);
  const objScale = useMemo(
    () =>
      getObjectScale(courseAppearance.scaleSizes, mapScale, course.printScale),
    [courseAppearance, mapScale, course.printScale]
  );

  useEffect(() => {
    if (clipLayer) {
      const extent = transformExtent(
        getPrintAreaExtent(course, mapScale),
        paperToProjected
      );
      const extentPolygon = polygonFromExtent(extent);
      const clipSource = clipLayer.getSource();
      clipSource.clear();
      clipSource.addFeature(new Feature(extentPolygon));
    }
  }, [clipLayer, course, crs, paperToProjected]);

  const controlsGeoJSON = useControls(course.controls);
  const controlConnectionsGeoJSON = useControlConnections(
    course.controls,
    courseAppearance.autoLegGapSize,
    course.labelKind,
    objScale
  );
  const specialObjectsGeoJSON = useSpecialObjects(
    course.specialObjects,
    course.controls.length
  );
  const courseObjects = useMemo(
    () =>
      courseObjectsGeoJSON(controlConnectionsGeoJSON, specialObjectsGeoJSON),
    [controlConnectionsGeoJSON, specialObjectsGeoJSON]
  );
  const controlLabelsGeoJSON = useNumberPositions(
    course.controls,
    courseObjects,
    course.labelKind,
    objScale
  );
  useControlDescriptions(
    map,
    paperToProjected,
    eventName,
    mapScale,
    course,
    specialObjectsGeoJSON
  );

  const controlFeaturesRef = useRef();
  const controlFeatures = useMemo(() => {
    const geojson = new GeoJSON();
    return geojson.readFeatures(
      featureCollection([
        ...controlsGeoJSON.features,
        ...controlConnectionsGeoJSON.features,
      ]),
      {
        dataProjection: ppenProjection,
        featureProjection: mapProjection,
      }
    );
  }, [controlsGeoJSON, controlConnectionsGeoJSON, mapProjection]);
  controlFeaturesRef.current = controlFeatures;
  const objectFeaturesRef = useRef([]);
  const objectFeatures = useMemo(() => {
    const geojson = new GeoJSON();
    return geojson.readFeatures(
      featureCollection([
        ...controlLabelsGeoJSON.features,
        ...specialObjectsGeoJSON.features,
      ]),
      { dataProjection: ppenProjection, featureProjection: mapProjection }
    );
  }, [controlLabelsGeoJSON, specialObjectsGeoJSON, mapProjection]);
  objectFeaturesRef.current = objectFeatures;

  const { layer: controlsLayer, source: controlsSource } = useVector(
    map,
    controlFeatures,
    vectorLayerOptions
  );
  useEffect(() => {
    setControlsSource(controlsSource);
  }, [controlsSource, setControlsSource]);
  const { layer: objectsLayer } = useVector(
    map,
    objectFeatures,
    vectorLayerOptions
  );
  // Paper millimeters to world meters factor
  const f = mapScale / 1000;
  useStyle(controlsLayer, controlFeaturesRef, f * objScale);
  useStyle(objectsLayer, objectFeaturesRef, f * objScale);

  return null;
}

function getMap({ map, mapFile, clipLayer, setControlsSource, projections }) {
  return { map, mapFile, clipLayer, setControlsSource, projections };
}

const vectorLayerOptions = {
  layerOptions: {
    zIndex: 1,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
  },
};
