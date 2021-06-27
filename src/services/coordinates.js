export function transformExtent(extent, fn) {
  return [
    [extent[0], extent[1]],
    [extent[2], extent[3]],
  ]
    .map(fn)
    .flat();
}
