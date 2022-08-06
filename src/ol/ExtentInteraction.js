import { containsCoordinate, getCenter, getHeight, getWidth } from "ol/extent";
import OlExtentInteraction from "ol/interaction/Extent";

/**
 * This is an extended version of OpenLayers' ol/interaction/Extent, with these major differences:
 *
 *   * Does not hog all map events: map can still be panned etc.
 *   * Does only allow to modify the initial extent, not creating a new one by
 *     clicking outside the map
 */
export default class ExtentInteraction extends OlExtentInteraction {
  /***
   * @type (eventType: 'extentchangeend', handler: ({type: 'eventchangeend', extent: Extent}) => void)   */
  on;

  constructor(options) {
    super(options);
    this.create_ = options?.create;
  }

  handleEvent(mapBrowserEvent) {
    super.handleEvent(mapBrowserEvent);
    return !this.pointerHandler_ && !this.dragDelta_;
  }

  handlePointerMove_(mapBrowserEvent) {
    const pixel = mapBrowserEvent.pixel;
    const map = mapBrowserEvent.map;
    let cursor = "auto";

    const vertex = this.snapToVertex_(pixel, map);
    const extent = this.getExtentInternal();
    if (vertex) {
      if (vertex[0] === extent[0] && vertex[1] === extent[1]) {
        cursor = "ne-resize";
      } else if (vertex[0] === extent[2] && vertex[1] === extent[1]) {
        cursor = "nw-resize";
      } else if (vertex[0] === extent[0] && vertex[1] === extent[3]) {
        cursor = "se-resize";
      } else if (vertex[0] === extent[2] && vertex[1] === extent[3]) {
        cursor = "sw-resize";
      } else if (vertex[0] === extent[0]) {
        cursor = "w-resize";
      } else if (vertex[0] === extent[2]) {
        cursor = "e-resize";
      } else if (vertex[1] === extent[1]) {
        cursor = "n-resize";
      } else {
        cursor = "s-resize";
      }
    } else if (
      extent &&
      containsCoordinate(extent, mapBrowserEvent.coordinate)
    ) {
      cursor = "all-scroll";
    }
    map.getTarget().style.cursor = cursor;
  }

  handleDownEvent(mapBrowserEvent) {
    const pixel = mapBrowserEvent.pixel;
    const map = mapBrowserEvent.map;

    const extent = this.getExtentInternal();
    const coordinate = mapBrowserEvent.coordinate;

    const vertex = this.snapToVertex_(pixel, map);

    if (!this.create_ && !vertex) {
      if (containsCoordinate(extent, coordinate)) {
        const center = getCenter(extent);
        this.dragDelta_ = [
          coordinate[0] - center[0],
          coordinate[1] - center[1],
        ];
        this._dragStartExtent = this.extent_;
        return true;
      }

      return true;
    }

    this._dragStartExtent = this.extent_;
    return super.handleDownEvent(mapBrowserEvent);
  }

  handleUpEvent(mapBrowserEvent) {
    this.dragDelta_ = undefined;
    const handled = super.handleUpEvent(mapBrowserEvent);
    if (
      this.create_ ||
      (this._dragStartExtent &&
        this.extent_.some((x, i) => this._dragStartExtent[i] !== x))
    ) {
      this.dispatchEvent({ type: "extentchangeend", extent: this.extent_ });
    }

    return handled;
  }

  handleDragEvent(mapBrowserEvent) {
    if (this.dragDelta_) {
      const coordinate = mapBrowserEvent.coordinate;
      const center = [
        coordinate[0] - this.dragDelta_[0],
        coordinate[1] - this.dragDelta_[1],
      ];
      const extent = this.extent_;
      const width = getWidth(extent);
      const height = getHeight(extent);
      this.setExtent([
        center[0] - width / 2,
        center[1] - height / 2,
        center[0] + width / 2,
        center[1] + height / 2,
      ]);
      return true;
    } else {
      return super.handleDragEvent(mapBrowserEvent);
    }
  }
}
