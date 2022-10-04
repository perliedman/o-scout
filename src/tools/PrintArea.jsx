import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useEffect, useMemo, useRef } from "react";
import {
  fromProjectedCoord,
  toProjectedCoord,
  transformExtent,
} from "../services/coordinates";
import useEvent, { useMap } from "../store";
import shallow from "zustand/shallow";
import ExtentInteraction from "../ol/ExtentInteraction";
import { getPrintAreaExtent } from "../models/course";

export default function PrintArea() {
  const { map, mapFile } = useMap(getMap);
  const { course, setPrintAreaExtent } = useEvent(getSelectedCourse, shallow);

  const crs = useMemo(() => mapFile?.getCrs(), [mapFile]);

  useEffect(() => {
    if (map && course) {
      const initialExtent = transformExtent(
        getPrintAreaExtent(course, crs.scale),
        (c) => toProjectedCoord(crs, c)
      );
      const interaction = new ExtentInteraction({
        extent: initialExtent,
        boxStyle,
        pointerStyle: new Style(),
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

      return () => {
        map.removeInteraction(interaction);
      };
    }
  }, [crs, mapFile, map, course, setPrintAreaExtent]);

  return null;
}

const boxStyle = new Style({
  stroke: new Stroke({ color: "#444", lineDash: [6, 10], width: 3 }),
  fill: null,
});

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
