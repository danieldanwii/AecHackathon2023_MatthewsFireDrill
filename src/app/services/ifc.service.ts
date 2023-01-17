import { DoubleSide, MeshLambertMaterial } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { IFCLoader } from 'web-ifc-three/IFCLoader';

export class IfcService {
  currentModel = -1;
  ifcViewer?: IfcViewerAPI;
  container?: HTMLElement;
  onSelectActions: ((modelID: number, id: number) => void)[];
  ifcProductsType: { [modelID: number]: { [expressID: number]: number } };
  witIfcLoader?: IFCLoader;
  scene?: any;

  constructor() {
    this.onSelectActions = [];
    this.ifcProductsType = {};
  }


  // SETUP
  startIfcViewer(container: HTMLElement) {
    if (!container) return this.notFoundError('container');
    this.container = container;
    this.setupIfcScene();
    this.setupInputs();
  }

  setupIfcScene() {
    if (!this.container) return;

    const preselectMaterial = this.newMaterial(0xfbc02d, 0.2);
    const selectMaterial = this.newMaterial(0xfbc02d, 0.5);
    this.ifcViewer = new IfcViewerAPI({
      container: this.container,
      preselectMaterial,
      selectMaterial,
    });

    this.ifcViewer.axes.setAxes();
    this.ifcViewer.grid.setGrid(100, 100);
    
    this.ifcViewer.IFC.setWasmPath('../assets/');
    // Multithreading
    this.ifcViewer.IFC.properties.loader.ifcManager.useWebWorkers(true, '../assets/IFCWorker.js')

    this.scene = this.ifcViewer.context.getScene();

  }

  setupInputs() {
    if (!this.container) return;
    this.container.onclick = this.handleClick;
    this.container.ondblclick = this.handleDoubleClick;
    this.container.onmousemove = this.handleMouseMove;
  }

  subscribeOnSelect(action: (modelID: number, id: number) => void) {
    this.onSelectActions.push(action);
  }

  // LOADERS
  async loadIfc(file: File) {

    this.ifcViewer?.IFC.loader.ifcManager.applyWebIfcConfig({
      COORDINATE_TO_ORIGIN: true,
      USE_FAST_BOOLS: false,
    });

    await this.ifcViewer?.IFC.loadIfc(file);
  }

  async loadIfcUrl(filePath: string) {
    await this.ifcViewer?.IFC.loadIfcUrl(filePath);
  }

  async loadProjectIfcs(ifcFiles: FileList){
    for(let i = 0; i < ifcFiles.length; i++){
      console.log(ifcFiles[i])
      this.loadIfc(ifcFiles[i]);
    }
  }

setupProgressNotification(progressText: HTMLElement) {
  this.ifcViewer?.IFC.loader.ifcManager.setOnProgress((event) => {
    const percent = (event.loaded / event.total) * 100;
    const result = Math.trunc(percent);
    progressText.innerText = result.toString();
    })
  }


  // SELECTION
  select(modelID: number, expressID: number, pick = true) {
    if (pick)
      this.ifcViewer?.IFC.selector.pickIfcItemsByID(modelID, [expressID]);
    this.currentModel = modelID;
    this.onSelectActions.forEach((action) => action(modelID, expressID));
  }

  async pick() {
    const found = await this.ifcViewer?.IFC.selector.pickIfcItem();
    if (found == null || found == undefined) return;
    this.select(found.modelID, found.id, false);
  }

  private handleClick = (_event: Event) => {};

  private handleDoubleClick = async (event: Event) => {
    await this.pick();
  };

  private handleMouseMove = (_event: Event) => {
    this.ifcViewer?.IFC.selector.prePickIfcItem();
  };

  // ERRORS
  private notFoundError(item: string) {
    throw new Error(`ERROR: ${item} could not be found!`);
  }

  // MATERIALS
  private newMaterial(color: number, opacity: number) {
    return new MeshLambertMaterial({
      color,
      opacity,
      transparent: true,
      depthTest: false,
      side: DoubleSide,
    });
  }
}
