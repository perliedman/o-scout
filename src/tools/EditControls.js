import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEvent, { useCrs, useMap } from "../store";
import ModifyInteraction from "ol/interaction/Modify";
import { fromProjectedCoord, getObjectScale } from "../services/coordinates";
import { never } from "ol/events/condition";
import { courseFeatureStyle } from "../course-feature-style";
import { useHotkeys } from "react-hotkeys-hook";
import useSelect from "../ol/use-select";
import ToolButton from "../ui/ToolButton";
import shallow from "zustand/shallow";

export default function EditControls() {
  const { map, controlsSource } = useMap(getMap);
  const {
    selectedCourseId,
    selectedCourse,
    courseAppearance,
    setControlCoordinates,
    removeControl,
  } = useEvent(getEvent, shallow);

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
      selectedCourse
        ? getObjectScale(
            courseAppearance.scaleSizes,
            crs.scale,
            selectedCourse.printScale
          )
        : 1,
    [courseAppearance, crs.scale, selectedCourse]
  );
  const style = useCallback(
    (feature, resolution) => {
      const f = crs.scale / 1000;
      return courseFeatureStyle(
        featuresRef,
        f * objScale,
        true,
        feature,
        resolution
      );
    },
    [crs, featuresRef, objScale]
  );

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
      const modify = new ModifyInteraction({
        deleteCondition: never,
        source: controlsSource,
      });
      modify.on("modifyend", (e) => {
        e.features.forEach((feature) =>
          setControlCoordinates(
            selectedCourseId,
            feature.get("id"),
            fromProjectedCoord(crs, feature.getGeometry().getCoordinates())
          )
        );
      });

      map.addInteraction(modify);
      return () => {
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
    <div>
      <ToolButton disabled={!selectedControlId} onClick={deleteSelected}>
        Delete
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

function getMap({ map, controlsSource }) {
  return { map, controlsSource };
}

function getEvent({
  selectedCourseId,
  courses,
  courseAppearance,
  actions: {
    control: { remove: removeControl, setCoordinates: setControlCoordinates },
  },
}) {
  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId
  );
  return {
    selectedCourseId,
    selectedCourse,
    courseAppearance,
    setControlCoordinates,
    removeControl,
  };
}
