declare module "worker-loader!*" {
  class TileWorker extends Worker {
    constructor();
  }

  export = TileWorker;
}
