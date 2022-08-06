import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useEffect, useMemo, useRef } from "react";
import { getExtent } from "../models/print-area";
import {
  fromProjectedCoord,
  toProjectedCoord,
  transformExtent,
} from "../services/coordinates";
import useEvent, { useMap } from "../store";
import shallow from "zustand/shallow";
import ExtentInteraction from "../ol/ExtentInteraction";

export default function PrintArea() {
  const { map, mapFile } = useMap(getMap);
  const { course, setPrintAreaExtent } = useEvent(getSelectedCourse, shallow);

  const crs = useMemo(() => mapFile?.getCrs(), [mapFile]);
  const currentExtent = useRef();

  useEffect(() => {
    if (map && course) {
      const initialExtent = transformExtent(
        getExtent(course.printArea, course),
        (c) => toProjectedCoord(crs, c)
      );
      const interaction = new ExtentInteraction({
        extent: initialExtent,
        boxStyle,
        pointerStyle: new Style(),
      });
      interaction.on("extentchanged", ({ extent }) => {
        currentExtent.current = [...extent];
      });
      map.on("pointerup", commitExtent);
      map.addInteraction(interaction);

      return () => {
        map.removeInteraction(interaction);
        map.un("pointerup", commitExtent);
      };

      function commitExtent() {
        if (currentExtent.current) {
          setPrintAreaExtent(
            course.id,
            transformExtent(currentExtent.current, (c) =>
              fromProjectedCoord(crs, c)
            )
          );
        }
      }
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
