import Style from "ol/style/Style";
import Circle from "ol/style/Circle";
import Stroke from "ol/style/Stroke";
import { courseOverPrintRgb, selectedOverPrintRgb } from "./models/course";
import RegularShape from "ol/style/RegularShape";
import {
  controlCircleOutsideDiameter,
  overprintLineWidth,
  startTriangleRadius,
} from "./services/use-number-positions";
import Text from "ol/style/Text";
import Fill from "ol/style/Fill";
import { useCallback, useEffect } from "react";

export default function useStyle(
  layer,
  featuresRef,
  objScale,
  selected = false
) {
  const styleFn = useCallback(
    (feature, resolution) =>
      courseFeatureStyle(featuresRef, objScale, selected, feature, resolution),
    [featuresRef, objScale, selected]
  );
  useEffect(() => {
    layer.setStyle(styleFn);
  }, [layer, styleFn]);
}

export function courseFeatureStyle(
  featuresRef,
  objScale,
  selected,
  feature,
  resolution
) {
  const kind = feature.get("kind");
  const color = selected ? selectedOverPrintRgb : courseOverPrintRgb;
  let style;

  // Note: where applicable, always use setRadius *last*, since that is what
  // forces OL to actually update the style of circles.
  // See https://github.com/openlayers/openlayers/issues/6233

  if (kind === "normal") {
    const image = controlStyle.getImage();
    const stroke = image.getStroke();
    stroke.setWidth(dimension(overprintLineWidth));
    stroke.setColor(color);
    image.setRadius(dimension(controlCircleOutsideDiameter / 2));
    style = controlStyle;
  } else if (kind === "start") {
    style = selected ? selectedStartStyle : startStyle;
    const image = style.getImage();
    image.getStroke().setColor(color);
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
  } else if (kind === "finish") {
    finishStyle.forEach((style, i) => {
      const image = style.getImage();
      const stroke = image.getStroke();
      stroke.setWidth(dimension(overprintLineWidth));
      stroke.setColor(color);
      image.setRadius(dimension(2 + i));
    });
    style = finishStyle;
  } else if (kind === "line") {
    const stroke = lineStyle.getStroke();
    stroke.setWidth(dimension(overprintLineWidth));
    stroke.setColor(color);
    style = lineStyle;
  } else if (kind === "number") {
    const text = numberStyle.getText();
    text.setText(feature.get("label"));
    text.setScale(dimension(0.6));
    style = numberStyle;
  } else if (kind === "white-out") {
    style = whiteOutStyle;
  } else if (kind === "descriptions") {
    return null;
  } else {
    console.log(`Unhandled styling for object kind "${kind}".`);
  }

  return style;

  // Scales an absolute dimension (mm on paper) to pixels in current resolution
  function dimension(x) {
    return (x / resolution) * objScale;
  }
}

const invisible = new Fill({ color: "rgba(0,0,0,0)" });

export const controlStyle = new Style({
  image: new Circle({
    radius: 16,
    stroke: new Stroke({
      color: courseOverPrintRgb,
      width: overprintLineWidth,
    }),
    fill: invisible,
  }),
});

export const startStyle = new Style({
  image: new RegularShape({
    points: 3,
    radius: startTriangleRadius * 10 * 2,
    stroke: new Stroke({
      color: courseOverPrintRgb,
      width: overprintLineWidth * 10 * 2,
    }),
    fill: invisible,
    rotateWithView: true,
  }),
});

export const selectedStartStyle = new Style({
  image: new RegularShape({
    points: 3,
    radius: startTriangleRadius * 10 * 2,
    stroke: new Stroke({
      color: selectedOverPrintRgb,
      width: overprintLineWidth * 10 * 2,
    }),
    fill: invisible,
    rotateWithView: true,
  }),
});

export const finishStyle = [
  new Style({
    image: new Circle({
      radius: 128,
      stroke: new Stroke({
        color: courseOverPrintRgb,
        width: overprintLineWidth,
      }),
      fill: invisible,
    }),
  }),
  new Style({
    image: new Circle({
      radius: 128,
      stroke: new Stroke({
        color: courseOverPrintRgb,
        width: overprintLineWidth,
      }),
      fill: invisible,
    }),
  }),
];

export const lineStyle = new Style({
  stroke: new Stroke({ color: courseOverPrintRgb, width: 3 }),
});

export const numberStyle = new Style({
  text: new Text({
    fill: new Fill({ color: courseOverPrintRgb }),
    rotateWithView: true,
  }),
});

export const whiteOutStyle = new Style({
  fill: new Fill({ color: "white" }),
});
