import fetch from "./fetch";

export function getProjection(epsgCode) {
  return fetch(`https://epsg.io/${epsgCode}.proj4`, {}, { format: "text" });
}
