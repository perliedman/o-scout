export function transformExtent(extent, fn) {
  return [
    [extent[0], extent[1]],
    [extent[2], extent[3]],
  ]
    .map(fn)
    .flat();
}

const mmToMeter = 0.001;
export const toProjectedCoord = (crs, coordinate) => {
  return [
    coordinate[0] * mmToMeter * crs.scale + crs.easting,
    coordinate[1] * mmToMeter * crs.scale + crs.northing,
  ];
};

export const fromProjectedCoord = (crs, coordinate) => {
  return [
    (coordinate[0] - crs.easting) / crs.scale / mmToMeter,
    (coordinate[1] - crs.northing) / crs.scale / mmToMeter,
  ];
};
