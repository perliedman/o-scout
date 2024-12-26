import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  controlStyle,
  finishStyle,
  getStartStyle,
} from "../course-feature-style";
import { courseOverPrintRgb } from "../models/course";
import { fromProjectedCoord, getObjectScale } from "../services/coordinates";
import {
  controlCircleOutsideDiameter,
  overprintLineWidth,
} from "../services/use-number-positions";
import useEvent, { MapState, StateWithActions, useCrs, useMap } from "../store";
import DrawInteraction from "ol/interaction/Draw";
import { primaryAction } from "ol/events/condition";
import ToolButton, { ModeButton } from "../ui/ToolButton";
import shallow from "zustand/shallow";
import { ALL_CONTROLS_ID } from "../models/event";
import CircleStyle from "ol/style/Circle";
import Point from "ol/geom/Point";
import { Feature, MapBrowserEvent } from "ol";
import useOtherControls from "./use-other-controls";

type CreationMode = "Control" | "Finish";
const creationModes: CreationMode[] = ["Control", "Finish"];

export default function CreateCourse(): JSX.Element {
  const [activeMode, setActiveMode] = useState<CreationMode>("Control");
  const { map, controlsSource } = useMap(getMap);
  const {
    selectedCourseId,
    selectedCourse,
    controls,
    allControls,
    courseAppearance,
    addControl,
  } = useEvent(getEvent, shallow);

  const [showAllControls, setShowAllControls] = useState(true);

  const featuresRef = useRef<Feature[]>();
  useEffect(() => {
    if (controlsSource) {
      featuresRef.current = controlsSource.getFeatures();
      controlsSource.on("change", update);
      return () => {
        controlsSource.un("change", update);
      };
    }
    function update() {
      featuresRef.current = controlsSource?.getFeatures() || [];
    }
  }, [controlsSource]);

  const crs = useCrs();
  const objScale = useMemo(
    () =>
      crs?.scale && selectedCourse
        ? (crs.scale / 1000) *
          getObjectScale(
            courseAppearance.scaleSizes,
            crs.scale,
            selectedCourse.printScale
          )
        : 1,
    [courseAppearance, crs?.scale, selectedCourse]
  );

  const activeModeRef = useRef<CreationMode>(activeMode);
  activeModeRef.current = activeMode;
  const savedMode = useRef<CreationMode>();
  useEffect(() => {
    document.addEventListener("keydown", isShiftDown);
    document.addEventListener("keyup", isShiftUp);

    return () => {
      document.removeEventListener("keyup", isShiftUp);
      document.removeEventListener("keydown", isShiftDown);
    };

    function isShiftDown(event: KeyboardEvent) {
      if (event.shiftKey) {
        savedMode.current = activeModeRef.current;
        activeModeRef.current = "Finish";
        setActiveMode("Finish");
      }
    }
    function isShiftUp(event: KeyboardEvent) {
      if (!event.shiftKey && savedMode.current) {
        activeModeRef.current = savedMode.current;
        setActiveMode(savedMode.current);
      }
    }
  }, [activeModeRef, savedMode, setActiveMode]);

  const style = useCallback(
    (_, resolution) => {
      const numberControls = controlsSource?.getFeatures().length || 0;

      if (activeModeRef.current === "Finish") {
        finishStyle.forEach((style, i) => {
          const image = style.getImage() as CircleStyle;
          const stroke = image.getStroke();
          stroke.setWidth(dimension(overprintLineWidth));
          stroke.setColor(courseOverPrintRgb);
          image.setRadius(dimension(2 + i));
        });
        return finishStyle;
      } else if (numberControls === 0) {
        const startStyle = getStartStyle(courseOverPrintRgb);
        const image = startStyle.getImage();
        image.setScale(dimension(0.05));
        return startStyle;
      } else {
        const image = controlStyle.getImage() as CircleStyle;
        const stroke = image.getStroke();
        stroke.setWidth(dimension(overprintLineWidth));
        stroke.setColor(courseOverPrintRgb);
        image.setRadius(dimension(controlCircleOutsideDiameter / 2));
        return controlStyle;
      }

      function dimension(x: number) {
        return (x / resolution) * objScale;
      }
    },
    [controlsSource, objScale]
  );

  const highlightFeatureRef = useRef<Feature>();

  useEffect(() => {
    if (map && controlsSource) {
      const draw = new DrawInteraction({
        type: "Point",
        style,
        condition: (event) => {
          return primaryAction(event);
        },
      });

      draw.on("drawend", (event) => {
        if (highlightFeatureRef.current) {
          const controlId = highlightFeatureRef.current.get("id");
          const control = controls[controlId];
          addControl({ ...control }, selectedCourseId);
        } else {
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
                (event.feature.getGeometry() as Point)?.getCoordinates()
              ),
              description: kind === "finish" ? { all: "14.3" } : {},
            },
            selectedCourseId
          );
        }
      });

      map.addInteraction(draw);

      return () => {
        map.removeInteraction(draw);
      };
    }
  }, [map, crs, controls, controlsSource, addControl, selectedCourseId, style]);

  const { layer: otherControlsLayer } = useOtherControls({
    enabled: showAllControls,
    selectedCourse,
    allControls,
    courseAppearance,
    crs,
    map,
    highlightFeatureRef,
  });

  useEffect(() => {
    if (map && otherControlsLayer) {
      map.on("pointermove", onPointerMove);

      return () => {
        map.un("pointermove", onPointerMove);
      };
    }
 


    async function onPointerMove(e: MapBrowserEvent<PointerEvent>) {
      const features = await otherControlsLayer.getFeatures(e.pixel);
      if (features.length > 0) {
        const [feature] = features;

        const controlKind = feature.get("kind");

        const numberControls = controlsSource?.getFeatures().length || 0;
      
        let expectedKind: "start" | "normal" | "finish";

        if (numberControls === 0) {
          expectedKind = "start";
        } else if (activeModeRef.current === "Finish") {
          expectedKind = "finish";
        } else {
          expectedKind = "normal";
        }

        if (controlKind !== expectedKind) {
          if (highlightFeatureRef.current) {
            const previousHighlight = highlightFeatureRef.current;
            highlightFeatureRef.current = undefined;
            previousHighlight.changed();
          }
          return;
        }

        if (feature !== highlightFeatureRef.current) {
          highlightFeatureRef.current = feature;
          feature.changed();
        }
      } else if (highlightFeatureRef.current) {
        const previousHighlight = highlightFeatureRef.current;
        highlightFeatureRef.current = undefined;
        previousHighlight.changed();
      }
    }
  }, [addControl, selectedCourseId, controls, map, style, otherControlsLayer]);

  return (
    <div className="flex items-start">
      {creationModes.map((mode) => (
        <ModeButton
          key={mode}
          active={mode === activeMode}
          onClick={() => setActiveMode(mode)}
        >
          {mode}
        </ModeButton>
      ))}
      <ToolButton>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showAllControls}
            onChange={(e) => setShowAllControls(e.target.checked)}
            className="mr-2 rounded-sm"
          />{" "}
          Reuse controls
        </label>
      </ToolButton>
    </div>
  );
}

function getMap({ map, controlsSource }: MapState) {
  return { map, controlsSource };
}

function getEvent({
  selectedCourseId,
  courseAppearance,
  courses,
  controls,
  actions: {
    event: { addControl },
  },
}: StateWithActions) {
  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId
  );
  const allControls = courses.find((course) => course.id === ALL_CONTROLS_ID);
  return {
    selectedCourseId,
    selectedCourse,
    controls,
    allControls,
    courseAppearance,
    addControl,
  };
}

