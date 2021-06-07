import { Feature } from "ol";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Style from "ol/style/Style";
import Circle from "ol/style/Circle";
import { useEffect, useMemo } from "react";
import { useMap } from "./store";
import Stroke from "ol/style/Stroke";
import { courseOverPrintRgb } from "./models/course";

export default function CourseLayer({ course }) {
  const { map, mapFile } = useMap(getMap);

  const source = useMemo(() => new VectorSource(), []);
  const layer = useMemo(
    () =>
      new VectorLayer({
        source,
        style: new Style({
          image: new Circle({
            radius: 16,
            stroke: new Stroke({ color: courseOverPrintRgb, width: 3 }),
          }),
        }),
        zIndex: 1,
      }),
    [source]
  );

  useEffect(() => {
    if (map) {
      map.addLayer(layer);
      return () => {
        map.removeLayer(layer);
      };
    }
  }, [map, layer]);

  const crs = useMemo(() => mapFile.getCrs(), [mapFile]);
  const features = useMemo(
    () =>
      course.controls.map(
        (control) =>
          new Feature({
            geometry: new Point(toProjectedCoord(crs, control.coordinates)),
            ...control,
          })
      ),
    [crs, course.controls]
  );

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

function getMap({ map, mapFile }) {
  return { map, mapFile };
}
