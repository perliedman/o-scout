import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import OlExtentInteraction from "ol/interaction/Extent";
import { useEffect, useMemo, useRef } from "react";
import { getExtent } from "../models/print-area";
import {
  fromProjectedCoord,
  toProjectedCoord,
  transformExtent,
} from "../services/coordinates";
import useEvent, { useMap } from "../store";
import shallow from "zustand/shallow";

export default function PrintArea() {
  const { map, mapFile } = useMap(getMap);
  const { course, setPrintAreaExtent } = useEvent(getSelectedCourse, shallow);

  const crs = useMemo(() => mapFile?.getCrs(), [mapFile]);
  const currentExtent = useRef();

  useEffect(() => {
    if (map && course) {
      const interaction = new ExtentInteraction({
        extent: transformExtent(getExtent(course.printArea, course), (c) =>
          toProjectedCoord(crs, c)
        ),
        boxStyle,
        pointerStyle: new Style(),
      });
      interaction.on(
        "extentchanged",
        ({ extent }) => (currentExtent.current = extent)
      );
      map.on("pointerup", commitExtent);
      map.addInteraction(interaction);

      return () => {
        map.removeInteraction(interaction);
        map.un("pointerup", commitExtent);
      };

      function commitExtent() {
        setPrintAreaExtent(
          course.id,
          transformExtent(currentExtent.current, (c) =>
            fromProjectedCoord(crs, c)
          )
        );
      }
    }
  }, [crs, mapFile, map, course, setPrintAreaExtent]);

  return null;
}

const boxStyle = new Style({
  stroke: new Stroke({ color: "#444", lineDash: [8, 4], width: 1 }),
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

/**
 * This is an extended version of OpenLayers' ol/interaction/Extent, with these major differences:
 *
 *   * Does not hog all map events: map can still be panned etc.
 *   * Does only allow to modify the initial extent, not creating a new one by
 *     clicking outside the map
 */
class ExtentInteraction extends OlExtentInteraction {
  handleEvent(mapBrowserEvent) {
    super.handleEvent(mapBrowserEvent);
    return !this.pointerHandler_;
  }

  handlePointerMove_(mapBrowserEvent) {
    const pixel = mapBrowserEvent.pixel;
    const map = mapBrowserEvent.map;
    let cursor = "auto";

    const vertex = this.snapToVertex_(pixel, map);
    if (vertex) {
      const extent = this.getExtentInternal();
      if (vertex[0] === extent[0] && vertex[1] === extent[1]) {
        cursor = "ne-resize";
      } else if (vertex[0] === extent[2] && vertex[1] === extent[1]) {
        cursor = "nw-resize";
      } else if (vertex[0] === extent[0] && vertex[1] === extent[3]) {
        cursor = "se-resize";
      } else if (vertex[0] === extent[2] && vertex[1] === extent[3]) {
        cursor = "sw-resize";
      } else if (vertex[0] === extent[0]) {
        cursor = "w-resize";
      } else if (vertex[0] === extent[2]) {
        cursor = "e-resize";
      } else if (vertex[1] === extent[1]) {
        cursor = "n-resize";
      } else {
        cursor = "s-resize";
      }
    }
    map.getTarget().style.cursor = cursor;
  }

  handleDownEvent(mapBrowserEvent) {
    const pixel = mapBrowserEvent.pixel;
    const map = mapBrowserEvent.map;

    const vertex = this.snapToVertex_(pixel, map);

    if (!vertex) return true;

    return super.handleDownEvent(mapBrowserEvent);
  }
}
