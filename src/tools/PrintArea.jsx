import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useEffect, useMemo } from "react";
import {
  fromProjectedCoord,
  mmToMeter,
  toProjectedCoord,
  transformExtent,
} from "../services/coordinates";
import useEvent, { useMap } from "../store";
import shallow from "zustand/shallow";
import ExtentInteraction from "../ol/ExtentInteraction";
import { getPrintAreaExtent } from "../models/course";

import Feature from "ol/Feature.js";
import { Vector as VectorLayer } from "ol/layer.js";
import { Vector as VectorSource } from "ol/source.js";
import { fromExtent } from "ol/geom/Polygon.js";
import { getCenter, getHeight, getWidth } from "ol/extent";
import Fill from "ol/style/Fill";
import { paperSizeToMm } from "../services/print";

export default function PrintArea() {
  const { map, mapFile } = useMap(getMap);
  const { course, setPrintAreaExtent } = useEvent(getSelectedCourse, shallow);

  const crs = useMemo(() => mapFile?.getCrs(), [mapFile]);

  useEffect(() => {
    if (map && course) {
      const paperExtent = getPrintAreaExtent(course, crs.scale);
      const initialExtent = transformExtent(paperExtent, (c) =>
        toProjectedCoord(crs, c)
      );

      const { pageWidth, pageHeight } = course.printArea;
      const pageSizeMm = [
        pageWidth * paperSizeToMm,
        pageHeight * paperSizeToMm,
      ];
      const printAreaSizeMm = [
        getWidth(paperExtent),
        getHeight(paperExtent),
      ].map((x) => x * (crs.scale / course.printScale));

      const isValid =
        pageSizeMm[0] >= printAreaSizeMm[0] &&
        pageSizeMm[1] >= printAreaSizeMm[1];
      const boxStyle = new Style({
        stroke: new Stroke({
          color: isValid ? "#444" : "#FF0000",
          lineDash: [6, 10],
          lineCap: "square",
          width: 3,
        }),
        fill: null,
      });

      const interaction = new ExtentInteraction({
        extent: initialExtent,
        boxStyle,
        pointerStyle: new Style(),
      });

      const rectCoords = [];

      // Paper size on map
      const geoPageWidth = pageSizeMm[0] * course.printScale * mmToMeter;
      const geoPageHeight = pageSizeMm[1] * course.printScale * mmToMeter;
      const printAreaCenter = getCenter(initialExtent);

      rectCoords[0] = printAreaCenter[0] - geoPageWidth / 2;
      rectCoords[1] = printAreaCenter[1] - geoPageHeight / 2;
      rectCoords[2] = printAreaCenter[0] + geoPageWidth / 2;
      rectCoords[3] = printAreaCenter[1] + geoPageHeight / 2;

      const printLayer = new VectorLayer({
        source: new VectorSource({
          features: [new Feature(fromExtent(rectCoords))],
        }),
        style: new Style({
          stroke: new Stroke({ color: "#4f46e5", width: 1 }),
          fill: new Fill({ color: [255, 255, 255, 0.2] }),
        }),
      });

      interaction.on("extentchangeend", ({ extent }) => {
        if (extent) {
          setPrintAreaExtent(
            course.id,
            transformExtent(extent, (c) => fromProjectedCoord(crs, c))
          );
        }
      });
      map.addInteraction(interaction);
      map.addLayer(printLayer);

      return () => {
        map.removeInteraction(interaction);
        map.removeLayer(printLayer);
      };
    }
  }, [crs, mapFile, map, course, setPrintAreaExtent]);

  return null;
}

function getMap({ map, mapFile }) {
  return { map, mapFile };
}

function getSelectedCourse({
  courses,
  selectedCourseId,
  actions: {
    course: { setPrintAreaExtent },
  },
}) {
  return {
    course: courses.find(({ id }) => id === selectedCourseId),
    setPrintAreaExtent,
  };
}