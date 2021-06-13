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
import GeoJSON from "ol/format/GeoJSON";
import useNumberPositions, {
  controlCircleOutsideDiameter,
  overprintLineWidth,
  startTriangleRadius,
} from "./services/use-number-positions";
import Text from "ol/style/Text";
import Fill from "ol/style/Fill";
import Coordinate from "./models/coordinate";

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
              const startSpace = spacing(previous);
              const endSpace = spacing(control);
              if (l > startSpace + endSpace) {
                const vx = dx / l;
                const vy = dy / l;
                const startCoord = c1.add([vx * startSpace, vy * startSpace]);
                const endCoord = c2.add([-vx * endSpace, -vy * endSpace]);

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
  const numberGeoJSON = useNumberPositions(course.controls, (c) =>
    toProjectedCoord(crs, c)
  );

  useEffect(() => {
    source.clear();
    source.addFeatures(features);
    source.addFeatures(new GeoJSON().readFeatures(numberGeoJSON));
  }, [source, features, numberGeoJSON]);

  return null;

  function styleFn(feature, resolution) {
    const kind = feature.get("kind");
    if (kind === "normal") {
      const image = controlStyle.getImage();
      const stroke = image.getStroke();
      image.setRadius((controlCircleOutsideDiameter * 10) / 2 / resolution);
      stroke.setWidth((overprintLineWidth * 10) / resolution);
      return controlStyle;
    } else if (kind === "start") {
      const image = startStyle.getImage();
      image.setScale(0.5 / resolution);

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
        image.setRadius((20 + i * 10) / resolution);
        stroke.setWidth((overprintLineWidth * 10) / resolution);
      });
      return finishStyle;
    } else if (kind === "line") {
      const stroke = lineStyle.getStroke();
      stroke.setWidth((overprintLineWidth * 10) / resolution);
      return lineStyle;
    } else if (kind === "number") {
      const text = numberStyle.getText();
      text.setText(feature.get("label"));
      text.setScale(6 / resolution);
      return numberStyle;
    }
  }
}

const mmToMeter = 0.001;
const toProjectedCoord = (crs, coordinate) => {
  return new Coordinate(
    coordinate[0] * mmToMeter * crs.scale + crs.easting,
    coordinate[1] * mmToMeter * crs.scale + crs.northing
  );
};

function getMap({ map, mapFile }) {
  return { map, mapFile };
}

const controlStyle = new Style({
  image: new Circle({
    radius: 16,
    stroke: new Stroke({
      color: courseOverPrintRgb,
      width: overprintLineWidth,
    }),
  }),
});

const startStyle = new Style({
  image: new RegularShape({
    points: 3,
    radius: startTriangleRadius * 10 * 2,
    stroke: new Stroke({
      color: courseOverPrintRgb,
      width: overprintLineWidth * 10 * 2,
    }),
  }),
});

const finishStyle = [
  new Style({
    image: new Circle({
      radius: 128,
      stroke: new Stroke({
        color: courseOverPrintRgb,
        width: overprintLineWidth,
      }),
    }),
  }),
  new Style({
    image: new Circle({
      radius: 128,
      stroke: new Stroke({
        color: courseOverPrintRgb,
        width: overprintLineWidth,
      }),
    }),
  }),
];

const lineStyle = new Style({
  stroke: new Stroke({ color: courseOverPrintRgb, width: 3 }),
});

const numberStyle = new Style({
  text: new Text({ fill: new Fill({ color: courseOverPrintRgb }) }),
});

function spacing(control) {
  const { kind } = control;
  switch (kind) {
    case "start":
      return startTriangleRadius * 10;
    case "finish":
      return 30 + (overprintLineWidth * 10) / 2;
    default:
      return (
        (controlCircleOutsideDiameter / 2) * 10 + (overprintLineWidth * 10) / 2
      );
  }
}
