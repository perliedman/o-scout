import { useCallback, useEffect, useMemo, useRef } from "react";
import { controlStyle, finishStyle, startStyle } from "../course-feature-style";
import { courseOverPrintRgb } from "../models/course";
import { fromProjectedCoord, getObjectScale } from "../services/coordinates";
import {
  controlCircleOutsideDiameter,
  overprintLineWidth,
} from "../services/use-number-positions";
import useEvent, { useCrs, useMap } from "../store";
import DrawInteraction from "ol/interaction/Draw";
import GeometryType from "ol/geom/GeometryType";
import { useHotkeys } from "react-hotkeys-hook";
import hotkeys from "hotkeys-js";
import { click, noModifierKeys, primaryAction } from "ol/events/condition";

export default function CreateCourse() {
  const { map, controlsSource } = useMap(getMap);
  const { selectedCourseId, selectedCourse, courseAppearance, addControl } =
    useEvent(getEvent);

  const featuresRef = useRef();
  useEffect(() => {
    if (controlsSource) {
      featuresRef.current = controlsSource.getFeatures();
      controlsSource.on("changed", update);
      return () => {
        controlsSource.un("changed", update);
      };
    }
    function update() {
      featuresRef.current = controlsSource.getFeatures();
    }
  }, [controlsSource]);

  const crs = useCrs();
  const objScale = useMemo(
    () =>
      getObjectScale(
        courseAppearance.scaleSizes,
        crs.scale,
        selectedCourse.printScale
      ),
    [courseAppearance, crs.scale, selectedCourse.printScale]
  );

  const shiftPressed = useRef();
  useEffect(() => {
    document.addEventListener("keydown", isShiftDown);
    document.addEventListener("keyup", isShiftUp);

    return () => {
      document.removeEventListener("keyup", isShiftUp);
      document.removeEventListener("keydown", isShiftDown);
    };

    function isShiftDown(event) {
      if (event.shiftKey) {
        shiftPressed.current = true;
      }
    }
    function isShiftUp(event) {
      if (!event.shiftKey) {
        shiftPressed.current = false;
      }
    }
  }, [shiftPressed]);

  const style = useCallback(
    (_, resolution) => {
      const numberControls = controlsSource.getFeatures().length;

      if (shiftPressed.current) {
        finishStyle.forEach((style, i) => {
          const image = style.getImage();
          const stroke = image.getStroke();
          stroke.setWidth(dimension(overprintLineWidth));
          stroke.setColor(courseOverPrintRgb);
          image.setRadius(dimension(2 + i));
        });
        return finishStyle;
      } else if (numberControls === 0) {
        const image = startStyle.getImage();
        image.setScale(dimension(0.05));
        return startStyle;
      } else {
        const image = controlStyle.getImage();
        const stroke = image.getStroke();
        stroke.setWidth(dimension(overprintLineWidth));
        stroke.setColor(courseOverPrintRgb);
        image.setRadius(dimension(controlCircleOutsideDiameter / 2));
        return controlStyle;
      }

      function dimension(x) {
        return (x / resolution) * objScale * 10;
      }
    },
    [controlsSource, objScale]
  );

  useEffect(() => {
    if (map && controlsSource) {
      const draw = new DrawInteraction({
        type: GeometryType.POINT,
        style,
        condition: (event) => {
          shiftPressed.current = event.originalEvent.shiftKey;
          return primaryAction(event);
        },
      });

      draw.on("drawend", (event) => {
        const numberControls = controlsSource.getFeatures().length;
        const kind = shiftPressed.current
          ? "finish"
          : numberControls > 0
          ? "normal"
          : "start";
        addControl(
          {
            kind,
            coordinates: fromProjectedCoord(
              crs,
              event.feature.getGeometry().getCoordinates()
            ),
            description: kind === "finish" ? { all: "14.3" } : {},
          },
          selectedCourseId
        );
      });

      map.addInteraction(draw);

      map.on("keydown", (event) => {
        debugger;
      });

      // map.on("dblclick", createFinish);

      return () => {
        // map.un("dblclick", createFinish);
        map.removeInteraction(draw);
      };

      // function createFinish({ coordinate }) {
      //   addControl(
      //     {
      //       kind: "finish",
      //       coordinates: fromProjectedCoord(crs, coordinate),
      //       description: {},
      //     },
      //     selectedCourseId
      //   );
      // }
    }
  }, [map, crs, controlsSource, addControl, selectedCourseId, style]);

  return null;
}

function getMap({ map, controlsSource }) {
  return { map, controlsSource };
}

function getEvent({
  selectedCourseId,
  courseAppearance,
  courses,
  actions: {
    event: { addControl },
  },
}) {
  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId
  );
  return {
    selectedCourseId,
    selectedCourse,
    courseAppearance,
    addControl,
  };
}
