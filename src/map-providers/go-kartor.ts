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
import { createSvg } from "../services/svg-utils";
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

const tileGrid = new TileGrid({
  extent,
  origin: [extent[0], extent[3]],
  resolutions,
  minZoom: mapMinZoom,
});

type SVGNodeTemplate = {
  type: string;
  attrs?: Record<string, string>;
  children?: SVGNodeTemplate[];
};

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
          tileGrid,
        }),
        extent,
      })
    );
  }

  async renderSvg(
    projectedExtent: Extent,
    svgOptions: SvgOptions
  ): Promise<XMLDocument> {
    const tiles: SVGNodeTemplate[] = [];
    tileGrid.forEachTileCoord(projectedExtent, 14, (tileCoord) => {
      const tileExtent = tileGrid.getTileCoordExtent(tileCoord);
      const [z, x, y] = tileCoord;
      tiles.push({
        type: "image",
        attrs: {
          x: tileExtent[0].toString(),
          y: (-tileExtent[3]).toString(),
          width: "256",
          height: "256",
          "xlink:href": `https://kartor.gokartor.se/Master/${z}/${y}/${x}.png`,
        },
      });
    });

    // for (const tile of tiles) {
    //   const url = tile.attrs?.["xlink:href"];
    //   if (tile.attrs && url) {
    //     tile.attrs["xlink:href"] = await new Promise((resolve, reject) => {
    //       const image = new Image();
    //       image.src = url;
    //       image.crossOrigin = "anonymous";
    //       image.onload = () => {
    //         const canvas = document.createElement("canvas");
    //         canvas.width = image.width;
    //         canvas.height = image.height;
    //         const ctx = canvas.getContext("2d");
    //         ctx?.drawImage(image, 0, 0);
    //         resolve(canvas.toDataURL());
    //       };
    //       image.onerror = (err) => reject(new Error(err.toString()));
    //     });
    //   }
    // }

    const transform = `translate(${-projectedExtent[0]}, ${
      projectedExtent[3]
    })`;
    const mapGroup = {
      type: "g",
      attrs: { transform, fill: "transparent" },
      children: tiles,
    };
    const svg = createSvg([mapGroup]);
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    return svg;
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
