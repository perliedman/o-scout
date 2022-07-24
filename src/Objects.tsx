import { capitalize } from "lodash";
import { ReactNode, useMemo } from "react";
import { courseObjectsGeoJSON } from "./services/use-number-positions";
import useSpecialObjects from "./services/use-special-objects";
import useEvent, { EventState, MapState, useCrs, useMap } from "./store";

export default function Objects(): ReactNode {
  const {
    mapInstance: map,
    // mapFile,
    // clipLayer,
    // setControlsSource,
    // projections: { paperToProjected },
  } = useMap(getMap);
  const crs = useCrs();
  const mapProjection = useMemo(() => map?.getView().getProjection(), [map]);
  const mapScale = crs?.scale;
  const { objects } = useEvent(getEvent);
  const specialObjectsGeoJSON = useSpecialObjects(objects);

  const kindCounts: Record<string, number> = {};

  return (
    <ul>
      {objects.map((o, i) => {
        let kindCount;
        if (!kindCounts[o.kind]) {
          kindCount = kindCounts[o.kind] = 1;
        } else {
          kindCount = ++kindCounts[o.kind];
        }

        return <li key={i}>{`${capitalize(o.kind)} ${kindCount}`}</li>;
      })}
    </ul>
  );
}

function getMap({
  mapInstance,
  mapFile,
  clipLayer,
  setControlsSource,
  projections,
}: MapState) {
  return { mapInstance, mapFile, clipLayer, setControlsSource, projections };
}

function getEvent({ specialObjects }: EventState) {
  return { objects: specialObjects };
}
