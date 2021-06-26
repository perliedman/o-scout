import ImageLayer from "ol/layer/Image";
import Static from "ol/source/ImageStatic";
import { useEffect, useState } from "react";
import { svgToUrl } from "./services/svg-to-bitmap";
import {
  courseDefinitionToSvg,
  getControlDescriptionExtent,
  getSvgDimensions,
} from "./services/create-svg";

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
            const imageExtent = getControlDescriptionExtent(
              descriptionObject,
              svg
            );
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
