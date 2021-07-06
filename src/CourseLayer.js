import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "./store";
import GeoJSON from "ol/format/GeoJSON";
import useControls from "./services/use-controls";
import useControlConnections from "./services/user-control-connections";
import useSpecialObjects from "./services/use-special-objects";
import courseFeatureStyle from "./course-feature-style";
import useNumberPositions from "./services/use-number-positions";
import { useControlDescriptions } from "./ControlDescriptionLayer";
import Projection from "ol/proj/Projection";
import Units from "ol/proj/Units";
import { addCoordinateTransforms } from "ol/proj";
import { featureCollection } from "@turf/helpers";
import useClip from "./use-clip";
import { fromExtent as polygonFromExtent } from "ol/geom/Polygon";
import { transformExtent } from "./services/coordinates";
import { Feature } from "ol";

const ppenProjection = new Projection({
  code: "ppen",
  units: Units.METERS,
  axisOrientation: "enu",
  global: false,
  metersPerUnit: 0.001,
});

export default function CourseLayer({ eventName, course, courseAppearance }) {
  const { map, mapFile, clipLayer } = useMap(getMap);
  const crs = useMemo(() => mapFile.getCrs(), [mapFile]);
  const mapProjection = useMemo(() => map?.getView().getProjection(), [map]);

  useEffect(() => {
    if (mapProjection && crs) {
      addCoordinateTransforms(
        ppenProjection,
        mapProjection,
        (c) => toProjectedCoord(crs, c),
        (c) => fromProjectedCoord(crs, c)
      );
    }
  }, [mapProjection, crs]);

  const source = useMemo(() => new VectorSource(), []);
  const featuresRef = useRef([]);
  const mapScale = useMemo(() => mapFile.getCrs().scale, [mapFile]);
  const objScale = useMemo(
    () =>
      getObjectScale(courseAppearance.scaleSizes, mapScale, course.printScale),
    [courseAppearance, mapScale, course.printScale]
  );
  const layer = useMemo(
    () =>
      new VectorLayer({
        source,
        zIndex: 1,
        updateWhileAnimating: true,
        updateWhileInteracting: true,
      }),
    [source]
  );
  useClip(layer);

  useEffect(() => {
    if (clipLayer) {
      const extent = transformExtent(course.printArea?.extent, (c) =>
        toProjectedCoord(crs, c)
      );
      const extentPolygon = polygonFromExtent(extent);
      const clipSource = clipLayer.getSource();
      clipSource.clear();
      clipSource.addFeature(new Feature(extentPolygon));
    }
  }, [clipLayer, course, crs]);

  const style = useCallback(
    (feature, resolution) =>
      courseFeatureStyle(featuresRef, objScale, feature, resolution),
    [featuresRef, objScale]
  );
  useEffect(() => {
    layer.setStyle(style);
  }, [layer, style]);

  useEffect(() => {
    if (map) {
      map.addLayer(layer);
      return () => {
        map.removeLayer(layer);
      };
    }
  }, [map, layer]);

  const controlsGeoJSON = useControls(course.controls);
  const controlConnectionsGeoJSON = useControlConnections(
    course.controls,
    courseAppearance.autoLegGapSize,
    course.labelKind
  );
  const controlLabelsGeoJSON = useNumberPositions(
    course.controls,
    controlConnectionsGeoJSON,
    course.labelKind
  );
  const specialObjectsGeoJSON = useSpecialObjects(course.specialObjects);
  useControlDescriptions(map, eventName, course, specialObjectsGeoJSON);

  const features = useMemo(() => {
    const geojson = new GeoJSON();
    return geojson.readFeatures(
      featureCollection([
        ...controlsGeoJSON.features,
        ...controlConnectionsGeoJSON.features,
        ...controlLabelsGeoJSON.features,
        ...specialObjectsGeoJSON.features,
      ]),
      { dataProjection: ppenProjection, featureProjection: mapProjection }
    );
  }, [
    controlsGeoJSON,
    controlConnectionsGeoJSON,
    controlLabelsGeoJSON,
    specialObjectsGeoJSON,
    mapProjection,
  ]);
  featuresRef.current = features;

  useEffect(() => {
    source.clear();
    source.addFeatures(features);
  }, [source, features]);

  return null;
}

const mmToMeter = 0.001;
const toProjectedCoord = (crs, coordinate) => {
  return [
    coordinate[0] * mmToMeter * crs.scale + crs.easting,
    coordinate[1] * mmToMeter * crs.scale + crs.northing,
  ];
};
const fromProjectedCoord = (crs, coordinate) => {
  return [
    (coordinate[0] - crs.easting) / crs.scale / mmToMeter,
    (coordinate[1] - crs.northing) / crs.scale / mmToMeter,
  ];
};

function getMap({ map, mapFile, clipLayer }) {
  return { map, mapFile, clipLayer };
}

function getObjectScale(scaleSizes, mapScale, printScale) {
  switch (scaleSizes) {
    case "None":
      return printScale / mapScale;
    case "RelativeToMap":
      // Not at all sure about why 0.75 should be there.
      return (mapScale / printScale) * 0.75;
    case "RelativeTo15000":
      return 15000 / mapScale;
    default:
      throw new Error(`Unknown scaleSizes mode "${scaleSizes}".`);
  }
}
