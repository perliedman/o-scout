import ImageLayer from "ol/layer/Image";
import Static from "ol/source/ImageStatic";
import { useEffect, useState } from "react";
import { svgToUrl } from "./services/svg-to-bitmap";
import { courseDefinitionToSvg } from "./services/create-svg";

export function useControlDescriptions(
  map,
  eventName,
  course,
  specialObjectsGeoJSON
) {
  const [descriptionLayers, setDescriptionLayers] = useState([]);

  useEffect(() => {
    createLayers();

    async function createLayers() {
      const layers = await Promise.all(
        specialObjectsGeoJSON.features
          .filter((object) => object.properties.kind === "descriptions")
          .map(async (descriptionObject) => {
            const svg = await courseDefinitionToSvg(eventName, course);
            svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
            const url = await svgToUrl(svg);
            const imageSize = ["width", "height"].map((attrib) =>
              Number(svg.getAttribute(attrib))
            );
            const aspectRatio = imageSize[1] / imageSize[0];
            const { bbox } = descriptionObject;
            // PPen gives size of one "cell" (column width)
            const extentWidth = (bbox[2] - bbox[0]) * 8;
            const extentHeight = extentWidth * aspectRatio;
            const imageExtent = [
              bbox[0],
              bbox[1] - extentHeight,
              bbox[0] + extentWidth,
              bbox[1],
            ];
            return new ImageLayer({
              source: new Static({
                url,
                imageExtent,
              }),
              zIndex: 10,
            });
          })
      );

      setDescriptionLayers(layers);
    }
  }, [eventName, course, specialObjectsGeoJSON]);

  useEffect(() => {
    for (const descriptionLayer of descriptionLayers) {
      map.addLayer(descriptionLayer);
    }

    return () => {
      for (const descriptionLayer of descriptionLayers) {
        map.removeLayer(descriptionLayer);
      }
    };
  }, [map, descriptionLayers]);
}
