export function transformExtent(extent, fn) {
  return [
    [extent[0], extent[1]],
    [extent[2], extent[3]],
  ]
    .map(fn)
    .flat();
}

export const mmToMeter = 0.001;
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

/**
 * Calculate scale for objects (control circles etc.) given the type
 * of scaling, the background map's scale and the course's print scale.
 */
export function getObjectScale(scaleSizes, mapScale, printScale) {
  switch (scaleSizes) {
    case "None":
      return 1;
    case "RelativeToMap":
      // TODO: Don't know what 2 does here, but otherwise sizes do not match.
      return (printScale / mapScale) * 2;
    case "RelativeTo15000":
      return 15000 / mapScale;
    default:
      throw new Error(`Unknown scaleSizes mode "${scaleSizes}".`);
  }
}
