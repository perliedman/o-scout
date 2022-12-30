import TileLayer from "ol/layer/Tile";
import * as olSize from "ol/size";
import { ProjectionLike, get as getOlProjection } from "ol/proj";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";
import { Color, MapProvider, OcadCrs, OcadFile } from "../store";
import { getProjection } from "../services/epsg";
// eslint-disable-next-line import/no-webpack-loader-syntax
import TileWorker from "worker-loader!../tile.worker.js";
import { Coordinate } from "ol/coordinate";
import { fromProjectedCoord, toProjectedCoord } from "../services/coordinates";
import OcadTiler, { SvgOptions } from "ocad-tiler";
import XYZ from "ol/source/XYZ";
import { ImageTile, Tile } from "ol";
import { svgUrlToBitmapDataUrl } from "../services/svg-to-bitmap";
import TileState from "ol/TileState";
import { Extent } from "ol/extent";

type TileData = {
  tile: ImageTile;
  resolve: () => void;
  reject: (err: unknown) => void;
};

export default class OcadMap implements MapProvider {
  mapName: string;
  mapFile: OcadFile;
  fileBlob: Blob;
  tiler: OcadTiler;
  tileWorker?: TileWorker;
  crs: OcadCrs;

  constructor(mapName: string, mapFile: OcadFile, fileBlob: Blob) {
    this.mapName = mapName;
    this.mapFile = mapFile;
    this.fileBlob = fileBlob;
    this.crs = this.mapFile.getCrs();
    this.tiler = new OcadTiler(this.mapFile);
  }

  getCrs(): OcadCrs {
    return this.mapFile.getCrs();
  }

  getExtent(): Extent {
    return this.tiler.bounds;
  }

  getColors(): Color[] {
    return this.mapFile.colors;
  }

  async getOlProjection(): Promise<ProjectionLike> {
    const { crs } = this;
    const [projectionName, code] =
      crs.catalog === "EPSG"
        ? [`${crs.catalog}:${crs.code}`, crs.code]
        : // TODO: This is a really stupid fallback; figure out how
          // to set a really "generic" projection
          ["EPSG:3006", 3006];
    proj4.defs(projectionName, await getProjection(code));
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
    onError,
    onSuccess,
  }: {
    onError: (err: unknown) => void;
    onSuccess: () => void;
  }): Promise<TileLayer<XYZ>> {
    const tileWorker = await this.getTileWorker();
    const projection = await this.getOlProjection();

    const source = new XYZ({
      projection,
      tileLoadFunction: loadTile,
      url: "{z}/{x}/{y}.png",
    });

    const awaitedTiles: Record<string, TileData> = {};
    tileWorker.onmessage = async ({ data: { type, tileId, url, error } }) => {
      if (type === "TILE") {
        const tileData = awaitedTiles[tileId];
        if (tileData) {
          const { tile, resolve, reject } = tileData;
          try {
            const tileGrid = source.getTileGrid();
            if (!tileGrid) {
              throw new Error("Tile grid is not set.");
            }
            const tileSize = olSize.toSize(
              tileGrid.getTileSize(tile.tileCoord[0])
            );
            // Ideally, converting the SVG to a bitmap data URL should also
            // be done in the worker, but I have not found a way to do that yet.
            (tile.getImage() as HTMLImageElement).src =
              await svgUrlToBitmapDataUrl(url, tileSize);
            delete awaitedTiles[tileId];
            onSuccess();
            resolve();
          } catch (e) {
            reject(e);
          }
        } else {
          console.warn(`Received unknown tile ${tileId}.`);
        }
      } else if (type === "ERROR") {
        onError(error);
      }
    };

    return new TileLayer({ source, extent: this.tiler.bounds });

    function loadTile(tile: Tile) {
      const imageTile = tile as ImageTile;
      return new Promise<void>((resolve, reject) => {
        if (!(imageTile.getImage() as HTMLImageElement).src) {
          try {
            const { tileCoord } = tile;
            const [z] = tileCoord;
            const tileGrid = source.getTileGrid();
            if (!tileGrid) {
              throw new Error("Tile grid is not set.");
            }
            const resolution = tileGrid.getResolution(z);
            const tileSize = olSize.toSize(tileGrid.getTileSize(z));
            const extent = tileGrid.getTileCoordExtent(tileCoord);
            const tileId = tileCoord.join("/");
            awaitedTiles[tileId] = { tile: imageTile, resolve, reject };
            tileWorker.postMessage({
              type: "GET_TILE",
              tileId,
              extent,
              resolution,
              tileSize,
            });
          } catch (e) {
            onError(e);
            tile.setState(TileState.ERROR);
            reject(e);
          }
        } else {
          resolve();
        }
      });
    }
  }

  renderSvg(
    projectedExtent: Extent,
    svgOptions: SvgOptions
  ): Promise<XMLDocument> {
    return Promise.resolve(
      this.tiler.renderSvg(projectedExtent, 1, svgOptions)
    );
  }

  paperToProjected(c: Coordinate): Coordinate {
    return toProjectedCoord(this.crs, c);
  }

  projectedToPaper(c: Coordinate): Coordinate {
    return fromProjectedCoord(this.crs, c);
  }

  getDetails(): Array<[string, string]> {
    const { version, subVersion, subSubVersion, currentFileVersion } =
      this.mapFile.header;
    const crs = this.mapFile.getCrs();

    return [
      ["OCAD version", [version, subVersion, subSubVersion].join(".")],
      ["File version", currentFileVersion.toString()],
      ["Georeference", `${crs.name} (${crs.catalog}:${crs.code})`],
    ];
  }

  getWarnings(): string[] {
    return this.mapFile.warnings;
  }

  async close(): Promise<void> {
    if (this.tileWorker) {
      this.tileWorker.terminate();
    }
  }

  async getTileWorker(): Promise<TileWorker> {
    if (this.tileWorker) {
      return Promise.resolve(this.tileWorker);
    }

    return new Promise<TileWorker>((resolve, reject) => {
      const tileWorker = new TileWorker();
      tileWorker.onmessage = (message) => {
        if (message.data.type === "READY") {
          this.tileWorker = tileWorker;
          resolve(this.tileWorker);
        } else {
          reject(new Error(`Unexpected message: ${message.data.type}.`));
        }
      };
      tileWorker.postMessage({ type: "SET_MAP_FILE", blob: this.fileBlob });
    });
  }
}
