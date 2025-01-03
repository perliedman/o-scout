import Style from "ol/style/Style";
import Circle from "ol/style/Circle";
import Stroke from "ol/style/Stroke";
import {
  courseOverPrintRgb,
  palette,
  selectedOverPrintRgb,
} from "./models/course";
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
  courseAppearance = {},
  courseOverPrintColor = courseOverPrintRgb,
  styleWrapper
) {
  const styleFn = useCallback(
    (feature, resolution) =>
      courseFeatureStyle(
        featuresRef,
        objScale,
        courseAppearance,
        courseOverPrintColor,
        feature,
        resolution
      ),
    [featuresRef, objScale, courseAppearance, courseOverPrintColor]
  );
  useEffect(() => {
    layer.setStyle(
      styleWrapper
        ? (feature, resolution) => styleWrapper(feature, resolution, styleFn)
        : styleFn
    );
  }, [layer, styleFn, styleWrapper]);
}

export function courseFeatureStyle(
  featuresRef,
  objScale,
  courseAppearance,
  courseOverPrintColor,
  feature,
  resolution
) {
  const kind = feature.get("kind");
  const color = feature.get("color")
    ? palette[feature.get("color")]
    : courseOverPrintColor;
  let style;
  const {
    controlCircleSizeRatio = 1,
    lineWidthRatio = 1,
    numberSizeRatio = 1,
  } = courseAppearance;

  // Note: where applicable, always use setRadius *last*, since that is what
  // forces OL to actually update the style of circles.
  // See https://github.com/openlayers/openlayers/issues/6233

  switch (kind) {
    case "normal": {
      const image = controlStyle.getImage();
      const stroke = image.getStroke();
      stroke.setWidth(dimension(overprintLineWidth * controlCircleSizeRatio));
      stroke.setColor(color);
      image.setRadius(
        dimension(controlCircleOutsideDiameter / 2) * controlCircleSizeRatio
      );
      style = controlStyle;
      break;
    }
    case "start": {
      style = getStartStyle(color);
      const image = style.getImage();
      image.setScale(dimension(0.05 * controlCircleSizeRatio));

      const next = featuresRef.current[feature.get("index") + 1];
      if (next) {
        const c1 = feature.getGeometry().getCoordinates();
        const c2 = next.getGeometry().getCoordinates();
        const dx = c1[0] - c2[0];
        const dy = c1[1] - c2[1];
        const angle = Math.atan2(-dy, dx);
        image.setRotation(angle - Math.PI / 2);
      }
      break;
    }
    case "finish": {
      finishStyle.forEach((style, i) => {
        const image = style.getImage();
        const stroke = image.getStroke();
        stroke.setWidth(dimension(overprintLineWidth) * controlCircleSizeRatio);
        stroke.setColor(color);
        image.setRadius(dimension(2 + i) * controlCircleSizeRatio);
      });
      style = finishStyle;
      break;
    }
    case "line": {
      const stroke = lineStyle.getStroke();
      const lineWidth = feature.get("lineWidth");
      if (lineWidth) {
        stroke.setWidth(
          (lineWidth / resolution) *
            5 /* TODO: most likely incorrect, but without this lines are much too thin - should be conversion of paper mm to geographic coordinates */ *
            lineWidthRatio
        );
      } else {
        stroke.setWidth(dimension(overprintLineWidth) * lineWidthRatio);
      }
      stroke.setColor(color);
      style = lineStyle;
      break;
    }
    case "number": {
      const text = numberStyle.getText();
      text.setText(feature.get("label"));
      text.setScale(dimension(0.6) * numberSizeRatio);
      style = numberStyle;
      break;
    }
    case "white-out": {
      style = whiteOutStyle;
      break;
    }
    case "descriptions": {
      return null;
    }
    default: {
      console.log(`Unhandled styling for object kind "${kind}".`);
    }
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

const startStyleCache = {};
export function getStartStyle(color) {
  let style = startStyleCache[color];
  if (!style) {
    style = startStyleCache[color] = createStartStyle(color);
  }

  return style;
}

function createStartStyle(color) {
  return new Style({
    image: new RegularShape({
      points: 3,
      radius: startTriangleRadius * 10 * 2,
      stroke: new Stroke({
        color,
        width: overprintLineWidth * 10 * 2,
      }),
      fill: invisible,
      rotateWithView: true,
    }),
  });
}

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
  stroke: new Stroke({
    color: courseOverPrintRgb,
    width: 3,
    lineCap: "butt",
  }),
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
