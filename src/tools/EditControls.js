import { useEffect, useMemo } from "react";
import useEvent, { useMap } from "../store";
import ModifyInteraction from "ol/interaction/Modify";
import { fromProjectedCoord } from "../services/coordinates";

export default function EditControls() {
  const { map, mapFile, controlsSource } = useMap(getMap);
  const { selectedCourseId, setControlCoordinates } = useEvent(getEvent);

  const crs = useMemo(() => mapFile.getCrs(), [mapFile]);

  useEffect(() => {
    if (map && controlsSource) {
      const modify = new ModifyInteraction({ source: controlsSource });
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
  }, [map, crs, controlsSource, setControlCoordinates, selectedCourseId]);

  return null;
}

function getMap({ map, mapFile, controlsSource }) {
  return { map, mapFile, controlsSource };
}

function getEvent({
  selectedCourseId,
  actions: {
    control: { setCoordinates: setControlCoordinates },
  },
}) {
  return { selectedCourseId, setControlCoordinates };
}
