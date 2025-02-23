import { Coordinate } from "ol/coordinate";
import { applyGrivation, rotate } from "./models/coordinate";
import { mmToMeter, toProjectedCoord } from "./services/coordinates";
import useEvent, { OcadCrs, StateWithActions, useCrs } from "./store";
import Button from "./ui/Button";

export default function ApplyGrivation() {
  const { controls, transformAll } = useEvent(getState);
  const crs = useCrs();

  return (
    <Button
      size="large"
      onClick={() => {
        if (crs) {
          transformAll((c) => toMapCoord(crs, toProjectedCoord(crs, c)));
        }
      }}
    >
      Apply Grivation
    </Button>
  );
}

function getState({
  controls,
  actions: {
    control: { transformAll },
  },
}: StateWithActions) {
  return { controls, transformAll };
}

function toMapCoord(crs: OcadCrs, coord: Coordinate) {
  const map = [
    (coord[0] - crs.easting) / mmToMeter / crs.scale,
    (coord[1] - crs.northing) / mmToMeter / crs.scale,
  ];
  return rotate(map, crs.grivation);
}
