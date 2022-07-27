import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEvent, { useCrs, useMap } from "../store";
import ModifyInteraction from "ol/interaction/Modify";
import SnapInteraction from "ol/interaction/Snap";
import { fromProjectedCoord, getObjectScale } from "../services/coordinates";
import { never } from "ol/events/condition";
import { courseFeatureStyle } from "../course-feature-style";
import { useHotkeys } from "react-hotkeys-hook";
import useSelect from "../ol/use-select";
import ToolButton from "../ui/ToolButton";
import shallow from "zustand/shallow";
import { Feature } from "ol";
import { selectedOverPrintRgb } from "../models/course";
import useOtherControls from "./use-other-controls";
import { ALL_CONTROLS_ID } from "../models/event";

export default function EditControls() {
  const { map, controlsSource } = useMap(getMap);
  const {
    selectedCourseId,
    selectedCourse,
    allControls,
    courseAppearance,
    addControl,
    replaceControl,
    setControlCoordinates,
    removeControl,
  } = useEvent(getEvent, shallow);

  const [showAllControls, setShowAllControls] = useState(true);

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
      selectedCourse && crs?.scale
        ? getObjectScale(
            courseAppearance.scaleSizes,
            crs.scale,
            selectedCourse.printScale
          )
        : 1,
    [courseAppearance, crs?.scale, selectedCourse]
  );
  const style = useCallback(
    (feature, resolution) => {
      const f = crs.scale / 1000;
      return courseFeatureStyle(
        featuresRef,
        f * objScale,
        selectedOverPrintRgb,
        feature,
        resolution
      );
    },
    [crs, featuresRef, objScale]
  );

  const highlightFeatureRef = useRef();
  const { source: otherControlsSource } = useOtherControls({
    enabled: showAllControls,
    selectedCourse,
    allControls,
    courseAppearance,
    crs,
    map,
    highlightFeatureRef,
  });

  const [selectedControlId, setSelectedControlId] = useState();
  const selectOptions = useMemo(
    () => ({
      style,
      layers: (layer) => layer.getSource() === controlsSource,
    }),
    [style, controlsSource]
  );
  const selectedFeature =
    controlsSource && selectedControlId
      ? controlsSource
          .getFeatures()
          .find((feature) => feature.get("id") === selectedControlId)
      : null;
  useSelect(
    map,
    selectedFeature,
    (feature) => setSelectedControlId(feature?.get("id")),
    selectOptions
  );

  useEffect(() => {
    if (map && controlsSource) {
      const styleFunction = (_, resolution) =>
        style(new Feature({ kind: "normal" }), resolution);

      const modify = new ModifyInteraction({
        deleteCondition: never,
        source: controlsSource,
        style: styleFunction,
        pixelTolerance: 20,
        snapToPointer: true,
      });
      modify.on("modifyend", (e) => {
        e.features.forEach((feature) => {
          if (feature.get("kind") !== "line") {
            const coordinates = feature.getGeometry().getCoordinates();
            const snappedControlId = findSnap(otherControlsSource, coordinates);

            if (!snappedControlId) {
              setControlCoordinates(
                selectedCourseId,
                feature.get("id"),
                fromProjectedCoord(crs, coordinates)
              );
            } else {
              replaceControl(
                selectedCourseId,
                feature.get("index"),
                snappedControlId
              );
            }
          } else {
            const coordinates = feature.getGeometry().getCoordinates()[1];
            const snappedControlId = findSnap(otherControlsSource, coordinates);
            const beforeId = feature.get("end").id;
            if (!snappedControlId) {
              addControl(
                {
                  kind: "normal",
                  coordinates: fromProjectedCoord(crs, coordinates),
                },
                selectedCourseId,
                beforeId
              );
            } else {
              const snappedControl = allControls.controls.find(
                (control) => control.id === snappedControlId
              );
              addControl({ ...snappedControl }, selectedCourseId, beforeId);
            }
          }
        });
      });

      map.addInteraction(modify);
      const snap = new SnapInteraction({ source: otherControlsSource });
      map.addInteraction(snap);

      return () => {
        map.removeInteraction(snap);
        map.removeInteraction(modify);
      };
    }
  }, [
    map,
    crs,
    controlsSource,
    removeControl,
    setControlCoordinates,
    selectedCourseId,
    style,
    addControl,
    otherControlsSource,
    allControls,
  ]);

  useHotkeys("delete,backspace", deleteSelected, [selectedFeature]);
  useHotkeys("up", () => moveSelected(0, 1), [
    selectedFeature,
    map,
    setControlCoordinates,
  ]);
  useHotkeys("down", () => moveSelected(0, -1), [
    selectedFeature,
    map,
    setControlCoordinates,
  ]);
  useHotkeys("left", () => moveSelected(-1, 0), [
    selectedFeature,
    map,
    setControlCoordinates,
  ]);
  useHotkeys("right", () => moveSelected(1, 0), [
    selectedFeature,
    map,
    setControlCoordinates,
  ]);

  return (
    <div className="flex items-start">
      <ToolButton
        disabled={!selectedControlId}
        onClick={deleteSelected}
        title="Del"
      >
        Delete
      </ToolButton>
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

  function moveSelected(dx, dy) {
    if (!selectedFeature) return;

    const resolution = map.getView().getResolution();
    const [x, y] = selectedFeature.getGeometry().getCoordinates();
    setControlCoordinates(
      selectedCourseId,
      selectedFeature.get("id"),
      fromProjectedCoord(crs, [x + dx * resolution, y + dy * resolution])
    );
  }

  function deleteSelected() {
    if (selectedFeature) {
      removeControl(selectedCourseId, selectedFeature.get("id"));
      setSelectedControlId(null);
    }
  }
}

function findSnap(otherControlsSource, coordinates) {
  let result;
  otherControlsSource.forEachFeature((feature) => {
    const featureCoordinate = feature.getGeometry().getCoordinates();
    if (
      !result &&
      featureCoordinate[0] === coordinates[0] &&
      featureCoordinate[1] === coordinates[1]
    ) {
      result = feature.get("id");
    }
  });

  return result;
}

function getMap({ map, controlsSource }) {
  return { map, controlsSource };
}

function getEvent({
  selectedCourseId,
  courses,
  courseAppearance,
  actions: {
    event: { addControl },
    control: { remove: removeControl, setCoordinates: setControlCoordinates },
    course: { replaceControl },
  },
}) {
  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId
  );
  const allControls = courses.find((course) => course.id === ALL_CONTROLS_ID);
  return {
    selectedCourseId,
    selectedCourse,
    allControls,
    courseAppearance,
    addControl,
    replaceControl,
    setControlCoordinates,
    removeControl,
  };
}
