import XYZSource from 'ol/source/XYZ'
import ImageTile from 'ol/ImageTile'
import TileState from 'ol/TileState'
import * as olSize from 'ol/size'
import Renderer from 'ocad-tiler'

export default class OcadSource extends XYZSource {
  constructor(options) {
    super({
      opaque: false,
      projection: options.projection,
      tileGrid: options.tileGrid,
      wrapX: options.wrapX !== undefined ? options.wrapX : true,
    })

    this.renderer = new Renderer(options.ocadFile)
  }

  getTile(z, x, y) {
    const tileCoord = [z, x, y]
    const tileCoordKey = getKeyZXY(z, x, y)
    if (this.tileCache.containsKey(tileCoordKey)) {
      return this.tileCache.get(tileCoordKey)
    } else {
      const resolution = this.tileGrid.getResolution(z)
      const tileSize = olSize.toSize(this.tileGrid.getTileSize(z))
      const extent = this.tileGrid.getTileCoordExtent(tileCoord)
      const svg = this.renderer.renderSvg(extent, resolution)

      svg.setAttribute('width', tileSize[0])
      svg.setAttribute('height', tileSize[1])

      const tile = new OcadTile(tileCoord, tileSize, svg)
      this.tileCache.set(tileCoordKey, tile)

      return tile
    }
  }
}

class OcadTile extends ImageTile {
  constructor(tileCoord, tileSize, svg) {
    super(tileCoord, TileState.LOADING, `data:image/svg+xml;base64,${btoa(xml)}`)

    this.tileSize_ = tileSize
    this.renderSvg(svg)
  }

  getImage() {
    return this.image_
  }

  renderSvg(svg) {
    const image = new Image()
    const xml = new XMLSerializer().serializeToString(svg)
    const blobUrl = 
    image.onload = () => {
      this.image_ = image
      this.setState(TileState.LOADED)
    }
    image.onerror = err => {
      console.error(err)
      this.setState(TileState.ERROR)
    }
    image.src = blobUrl
  }
}

function getKeyZXY(z, x, y) {
  return `${z}/${x}/${y}`
}
