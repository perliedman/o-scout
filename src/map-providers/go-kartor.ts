import { SvgOptions } from "ocad-tiler";
import { Coordinate } from "ol/coordinate";
import { Extent } from "ol/extent";
import TileLayer from "ol/layer/Tile";
import { ProjectionLike, get as getOlProjection } from "ol/proj";
import { register } from "ol/proj/proj4";
import XYZ from "ol/source/XYZ";
import TileGrid from "ol/tilegrid/TileGrid";
import proj4 from "proj4";
import { fromProjectedCoord, toProjectedCoord } from "../services/coordinates";
import { getProjection } from "../services/epsg";
import { Color, MapProvider, OcadCrs } from "../store";

const projectionCode = 3006;
const projectionCatalog = "EPSG";
const projectionName = `${projectionCatalog}:${projectionCode}`;

const extent = [265000, 6130000, 925000, 7680000];
const scale = 15000;
const [easting, northing] = extent;
const hundredsMmToMeter = 1 / (100 * 1000);

const mapMinZoom = 3;
const mapMaxZoom = 15;
const mapMaxResolution = 0.5;
const crs = {
  name: projectionName,
  catalog: projectionCatalog,
  code: projectionCode,
  scale,
  easting,
  northing,
  toMapCoord(c: Coordinate) {
    return [
      (c[0] - easting) / hundredsMmToMeter / scale,
      (c[1] - northing) / hundredsMmToMeter / scale,
    ];
  },
  toProjectedCoord(c: Coordinate) {
    return [
      c[0] * hundredsMmToMeter * scale + easting,
      c[1] * hundredsMmToMeter * scale + northing,
    ];
  },
};

const mapMinResolution = Math.pow(2, mapMaxZoom) * mapMaxResolution;
const resolutions = Array.from({ length: mapMaxZoom + 1 }).map(
  (_, i: number) => 1 / (Math.pow(2, i) / mapMinResolution)
);
console.log(resolutions);
export default class GoKartor implements MapProvider {
  mapName = "GO-Kartor";

  getCrs(): OcadCrs {
    return crs;
  }

  getExtent(): Extent {
    return extent;
  }

  getColors(): Color[] {
    return [];
  }

  async getOlProjection(): Promise<ProjectionLike> {
    proj4.defs(projectionName, await getProjection(projectionCode));
    register(proj4);

    const olProj = getOlProjection(projectionName);
    if (!olProj) {
      throw new Error(
        `Could not get project ${projectionName} from OpenLayers.`
      );
    }

    return olProj;
  }

  async createTileLayer({
    onSuccess,
  }: {
    onError: (err: unknown) => void;
    onSuccess: () => void;
  }): Promise<TileLayer<XYZ>> {
    const projection = await this.getOlProjection();
    onSuccess();
    return Promise.resolve(
      new TileLayer({
        source: new XYZ({
          projection,
          url: "https://kartor.gokartor.se/Master/{z}/{y}/{x}.png",
          tileGrid: new TileGrid({
            extent,
            origin: [extent[0], extent[3]],
            resolutions,
            minZoom: mapMinZoom,
          }),
        }),
        extent,
      })
    );
  }

  renderSvg(projectedExtent: Extent, svgOptions: SvgOptions): XMLDocument {
    return document.implementation.createDocument(null, "xml", null);
  }

  paperToProjected(c: Coordinate): Coordinate {
    return toProjectedCoord(crs, c);
  }

  projectedToPaper(c: Coordinate): Coordinate {
    return fromProjectedCoord(crs, c);
  }

  getDetails(): Array<[string, string]> {
    return [];
  }

  getWarnings(): string[] {
    return [];
  }

  close(): void {
    // Do nothing
  }
}
