import Style from "ol/style/Style";
import Circle from "ol/style/Circle";
import Stroke from "ol/style/Stroke";
import { courseOverPrintRgb } from "./models/course";
import RegularShape from "ol/style/RegularShape";
import {
  controlCircleOutsideDiameter,
  overprintLineWidth,
  startTriangleRadius,
} from "./services/use-number-positions";
import Text from "ol/style/Text";
import Fill from "ol/style/Fill";
import { useCallback, useEffect } from "react";

export default function useStyle(layer, featuresRef, objScale) {
  const styleFn = useCallback(
    (feature, resolution) =>
      courseFeatureStyle(featuresRef, objScale, feature, resolution),
    [featuresRef, objScale]
  );
  useEffect(() => {
    layer.setStyle(styleFn);
  }, [layer, styleFn]);
}

export function courseFeatureStyle(featuresRef, objScale, feature, resolution) {
  const kind = feature.get("kind");
  if (kind === "normal") {
    const image = controlStyle.getImage();
    const stroke = image.getStroke();
    image.setRadius(dimension(controlCircleOutsideDiameter / 2));
    stroke.setWidth(dimension(overprintLineWidth));
    return controlStyle;
  } else if (kind === "start") {
    const image = startStyle.getImage();
    image.setScale(dimension(0.05));

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
      image.setRadius(dimension(2 + i));
      stroke.setWidth(dimension(overprintLineWidth));
    });
    return finishStyle;
  } else if (kind === "line") {
    const stroke = lineStyle.getStroke();
    stroke.setWidth(dimension(overprintLineWidth));
    return lineStyle;
  } else if (kind === "number") {
    const text = numberStyle.getText();
    text.setText(feature.get("label"));
    text.setScale(dimension(0.6));
    return numberStyle;
  } else if (kind === "white-out") {
    return whiteOutStyle;
  }

  // Scales an absolute dimension (mm on paper) to current resolution and object scale
  function dimension(x) {
    return (x / resolution) * objScale * 10;
  }
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

const whiteOutStyle = new Style({
  fill: new Fill({ color: "white" }),
});
