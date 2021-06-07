import { Feature } from "ol";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Style from "ol/style/Style";
import Circle from "ol/style/Circle";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMap } from "./store";
import Stroke from "ol/style/Stroke";
import { courseOverPrintRgb } from "./models/course";
import RegularShape from "ol/style/RegularShape";
import LineString from "ol/geom/LineString";

export default function CourseLayer({ course }) {
  const { map, mapFile } = useMap(getMap);

  const source = useMemo(() => new VectorSource(), []);
  const featuresRef = useRef([]);
  const style = useCallback(styleFn, []);
  const layer = useMemo(
    () =>
      new VectorLayer({
        source,
        style,
        zIndex: 1,
      }),
    [source, style]
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
      course.controls
        .map(
          (control, index) =>
            new Feature({
              geometry: new Point(toProjectedCoord(crs, control.coordinates)),
              index,
              ...control,
            })
        )
        .concat(
          course.controls
            .slice(1)
            .map((control, index) => {
              const previous = course.controls[index];
              const c1 = toProjectedCoord(crs, previous.coordinates);
              const c2 = toProjectedCoord(crs, control.coordinates);
              const dx = c2[0] - c1[0];
              const dy = c2[1] - c1[1];
              const l = Math.sqrt(dx * dx + dy * dy);
              if (l > 2 * lineSpace) {
                const ox = (lineSpace * dx) / l;
                const oy = (lineSpace * dy) / l;
                const startCoord = [c1[0] + ox, c1[1] + oy];
                const endCoord = [c2[0] - ox, c2[1] - oy];

                return new Feature({
                  geometry: new LineString([startCoord, endCoord]),
                  kind: "line",
                });
              }
              return null;
            })
            .filter(Boolean)
        ),
    [crs, course.controls]
  );
  featuresRef.current = features;

  useEffect(() => {
    source.clear();
    source.addFeatures(features);
  }, [source, features]);

  return null;

  function styleFn(feature, resolution) {
    const kind = feature.get("kind");
    if (kind === "normal") {
      const image = controlStyle.getImage();
      const stroke = image.getStroke();
      image.setRadius(32 / resolution);
      stroke.setWidth(5 / resolution);
      return controlStyle;
    } else if (kind === "start") {
      const image = startStyle.getImage();
      const stroke = image.getStroke();
      image.setScale(0.3 / resolution);
      stroke.setWidth(20 / resolution);

      const next = featuresRef.current[feature.get("index") + 1];
      if (next) {
        const c1 = feature.getGeometry().getCoordinates();
        const c2 = next.getGeometry().getCoordinates();
        const dx = c1[0] - c2[0];
        const dy = c1[1] - c2[1];
        const angle = Math.atan2(-dy, dx);
        image.setRotation(angle - Math.PI / 2);
      }

      return startStyle;
    } else if (kind === "finish") {
      finishStyle.forEach((style, i) => {
        const image = style.getImage();
        const stroke = image.getStroke();
        image.setRadius((24 + i * 8) / resolution);
        stroke.setWidth(5 / resolution);
      });
      return finishStyle;
    } else if (kind === "line") {
      const stroke = lineStyle.getStroke();
      stroke.setWidth(5 / resolution);
      return lineStyle;
    }
  }
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

const controlStyle = new Style({
  image: new Circle({
    radius: 16,
    stroke: new Stroke({ color: courseOverPrintRgb, width: 3 }),
  }),
});

const startStyle = new Style({
  image: new RegularShape({
    points: 3,
    radius: 128,
    stroke: new Stroke({ color: courseOverPrintRgb, width: 16 }),
  }),
});

const finishStyle = [
  new Style({
    image: new Circle({
      points: 3,
      radius: 128,
      stroke: new Stroke({ color: courseOverPrintRgb, width: 3 }),
    }),
  }),
  new Style({
    image: new Circle({
      radius: 128,
      stroke: new Stroke({ color: courseOverPrintRgb, width: 3 }),
    }),
  }),
];

const lineSpace = 60;
const lineStyle = new Style({
  stroke: new Stroke({ color: courseOverPrintRgb, width: 3 }),
});
