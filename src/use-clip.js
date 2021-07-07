import { getVectorContext } from "ol/render";
import { useEffect } from "react";
import { useMap } from "./store";

export default function useClip(layer) {
  const clipLayer = useMap(getClipLayer);
  useEffect(() => {
    if (layer && clipLayer) {
      layer.on("postrender", clip);

      return () => {
        layer.un("postrender", clip);
      };
    }

    function clip(event) {
      const vectorContext = getVectorContext(event);
      const context = event.context;
      const canvas = context.canvas;
      context.fillStyle = "rgba(0,0,0,0.1)";
      clipLayer.getSource().forEachFeature(function (feature) {
        event.context.beginPath();
        drawGeometry(vectorContext, feature.getGeometry());
        context.rect(canvas.width, 0, -canvas.width, canvas.height);
        context.fill();
      });
    }
  }, [layer, clipLayer]);
}

function getClipLayer({ clipLayer }) {
  return clipLayer;
}

// This is a slightly modified version of OpenLayer's MultiPolygon draw code:
// https://github.com/openlayers/openlayers/blob/v4.6.5/src/ol/render/canvas/immediate.js#L683
//
// The difference is that we don't set any styling or begin a new path,
// which makes it possible to create a cutout of the boundaries.
function drawGeometry(vectorContext, geometry) {
  vectorContext.drawRings_(
    geometry.getOrientedFlatCoordinates(),
    0,
    /** @type {Array<number>} */ (geometry.getEnds()),
    geometry.getStride()
  );
}
