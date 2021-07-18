import { useEffect } from "react";
import useEvent, { useCrs, useMap } from "../store";
import ModifyInteraction from "ol/interaction/Modify";
import { fromProjectedCoord } from "../services/coordinates";

export default function EditControls() {
  const { map, controlsSource } = useMap(getMap);
  const { selectedCourseId, setControlCoordinates } = useEvent(getEvent);

  const crs = useCrs();

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

function getMap({ map, controlsSource }) {
  return { map, controlsSource };
}

function getEvent({
  selectedCourseId,
  actions: {
    control: { setCoordinates: setControlCoordinates },
  },
}) {
  return { selectedCourseId, setControlCoordinates };
}
