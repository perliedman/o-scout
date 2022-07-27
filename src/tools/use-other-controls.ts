import { Feature, Map } from "ol";
import VectorLayer from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { MutableRefObject, useCallback, useMemo, useRef } from "react";
import useStyle, { courseFeatureStyle } from "../course-feature-style";
import { Course, selectedOverPrintRgb } from "../models/course";
import { CourseAppearance } from "../models/course-appearance";
import useVector from "../ol/use-vector";
import { getObjectScale } from "../services/coordinates";
import { ppenProjection } from "../services/ppen";
import useControls from "../services/use-controls";
import { OcadCrs } from "../store";
import VectorSource from "ol/source/Vector";

type OtherControlsProps = {
  map?: Map;
  crs?: OcadCrs;
  enabled: boolean;
  allControls?: Course;
  selectedCourse?: Course;
  courseAppearance: CourseAppearance;
  highlightFeatureRef: MutableRefObject<Feature | undefined>;
};

export default function useOtherControls({
  enabled,
  map,
  crs,
  allControls,
  selectedCourse,
  courseAppearance,
  highlightFeatureRef,
}: OtherControlsProps): {
  layer: VectorLayer<VectorSource>;
  source: VectorSource;
} {
  const objScale = useMemo(
    () =>
      getObjectScale(
        courseAppearance.scaleSizes,
        crs?.scale,
        selectedCourse?.printScale
      ),
    [courseAppearance, crs?.scale, selectedCourse?.printScale]
  );

  const controls = useMemo(() => {
    if (!enabled) return [];
    const selectedCourseIds = new Set(
      selectedCourse?.controls.map((c) => c.id)
    );
    return (allControls?.controls || []).filter(
      (control) =>
        (selectedCourseIds.size === 0 || control.kind !== "start") &&
        !selectedCourseIds.has(control.id)
    );
  }, [enabled, selectedCourse, allControls]);
  const controlsGeoJSON = useControls(controls);
  const featureProjection = map?.getView().getProjection();
  const controlFeatures = useMemo(() => {
    const geojson = new GeoJSON();
    return geojson.readFeatures(controlsGeoJSON, {
      dataProjection: ppenProjection,
      featureProjection,
    });
  }, [controlsGeoJSON, featureProjection]);

  const vector = useVector(map, controlFeatures, {});
  const { layer: controlsLayer } = vector;

  const f = crs ? crs.scale / 1000 : 1;
  const highlighStyleFn = useCallback(
    (feature, resolution, fallbackStyleFn) => {
      if (feature === highlightFeatureRef.current) {
        return courseFeatureStyle(
          { current: [] },
          f * objScale,
          selectedOverPrintRgb,
          feature,
          resolution
        );
      } else {
        return fallbackStyleFn(feature, resolution);
      }
    },
    [highlightFeatureRef, f, objScale]
  );

  const controlFeaturesRef = useRef(controlFeatures);
  controlFeaturesRef.current = controlFeatures;
  useStyle(
    controlsLayer,
    controlFeaturesRef,
    f * objScale,
    "rgba(182, 44, 152, 0.5)",
    highlighStyleFn
  );

  return vector;
}
