import { useCallback, useEffect, useMemo, useRef } from "react";
import useEvent, { useCrs, useMap } from "../store";
import ModifyInteraction from "ol/interaction/Modify";
import SelectInteraction from "ol/interaction/Select";
import { fromProjectedCoord, getObjectScale } from "../services/coordinates";
import { never } from "ol/events/condition";
import { courseFeatureStyle } from "../course-feature-style";
import { useHotkeys } from "react-hotkeys-hook";

export default function EditControls() {
  const { map, controlsSource } = useMap(getMap);
  const {
    selectedCourseId,
    selectedCourse,
    courseAppearance,
    setControlCoordinates,
    removeControl,
  } = useEvent(getEvent);

  const featuresRef = useRef();
  useEffect(() => {
    featuresRef.current = controlsSource.getFeatures();
    controlsSource.on("changed", update);
    return () => {
      controlsSource.un("changed", update);
    };
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
  const style = useCallback(
    (feature, resolution) => {
      return courseFeatureStyle(
        featuresRef,
        objScale,
        true,
        feature,
        resolution
      );
    },
    [featuresRef, objScale]
  );

  const select = useMemo(
    () =>
      new SelectInteraction({
        style,
        layers: (layer) => layer.getSource() === controlsSource,
      }),
    [style, controlsSource]
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
      map.addInteraction(select);
      return () => {
        map.removeInteraction(select);
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
    select,
  ]);

  useHotkeys("delete,backspace", () => {
    select.getFeatures().forEach((feature) => {
      removeControl(selectedCourseId, feature.get("id"));
    });
  });

  return null;
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
