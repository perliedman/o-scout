import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { primaryAction } from "ol/events/condition";
import { ModeButton } from "../ui/ToolButton";
import shallow from "zustand/shallow";

export default function CreateCourse() {
  const [activeMode, setActiveMode] = useState("Control");
  const { map, controlsSource } = useMap(getMap);
  const { selectedCourseId, selectedCourse, courseAppearance, addControl } =
    useEvent(getEvent, shallow);

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
      (crs.scale / 1000) *
      getObjectScale(
        courseAppearance.scaleSizes,
        crs.scale,
        selectedCourse.printScale
      ),
    [courseAppearance, crs.scale, selectedCourse.printScale]
  );

  const activeModeRef = useRef(activeMode);
  const savedMode = useRef();
  useEffect(() => {
    document.addEventListener("keydown", isShiftDown);
    document.addEventListener("keyup", isShiftUp);

    return () => {
      document.removeEventListener("keyup", isShiftUp);
      document.removeEventListener("keydown", isShiftDown);
    };

    function isShiftDown(event) {
      if (event.shiftKey) {
        savedMode.current = activeModeRef.current;
        activeModeRef.current = "Finish";
        setActiveMode("Finish");
      }
    }
    function isShiftUp(event) {
      if (!event.shiftKey) {
        activeModeRef.current = savedMode.current;
        setActiveMode(savedMode.current);
      }
    }
  }, [activeModeRef, savedMode, setActiveMode]);

  const style = useCallback(
    (_, resolution) => {
      const numberControls = controlsSource.getFeatures().length;

      if (activeModeRef.current === "Finish") {
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
        return (x / resolution) * objScale;
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
          return primaryAction(event);
        },
      });

      draw.on("drawend", (event) => {
        const numberControls = controlsSource.getFeatures().length;
        const kind =
          activeModeRef.current === "Finish"
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

      return () => {
        map.removeInteraction(draw);
      };
    }
  }, [map, crs, controlsSource, addControl, selectedCourseId, style]);

  return (
    <div>
      {["Control", "Finish"].map((mode) => (
        <ModeButton
          key={mode}
          active={mode === activeMode}
          onClick={() => setActiveMode(mode !== activeMode ? mode : null)}
        >
          {mode}
        </ModeButton>
      ))}
    </div>
  );
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
