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

export default function courseFeatureStyle(featuresRef, feature, resolution) {
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
  } else if (kind === "white-out") {
    return whiteOutStyle;
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
