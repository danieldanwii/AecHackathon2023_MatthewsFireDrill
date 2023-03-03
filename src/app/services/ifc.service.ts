import { DoubleSide, MeshLambertMaterial } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { IFCLoader } from 'web-ifc-three/IFCLoader';
import { IfcScene } from 'web-ifc-viewer/dist/components/context/scene';

import { IFCWALL,
  IFCWALLSTANDARDCASE,
  IFCSLAB,
  IFCWINDOW,
  IFCMEMBER,
  IFCPLATE,
  IFCCURTAINWALL,
  IFCDOOR,
  IFCSPACE } from 'web-ifc'

export class IfcService {
  currentModel = -1;
  ifcViewer?: IfcViewerAPI;
  container?: HTMLElement;
  witIfcLoader?: IFCLoader;
  ifcScene?: IfcScene;
  
  onSelectActions: ((modelID: number, id: number) => void)[];
  ifcProductsType: { [modelID: number]: { [expressID: number]: number } };
  ifcModel: any;
  modelSubset: any;


  constructor() {
    this.onSelectActions = [];
    this.ifcProductsType = {};
  }

  /////////////////////////////////////////////////////////////////////////
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

    this.ifcViewer?.IFC.loader.ifcManager.applyWebIfcConfig({
      COORDINATE_TO_ORIGIN: true,
      USE_FAST_BOOLS: true,
    });
    
    this.ifcViewer.IFC.setWasmPath('../assets/');
    // Multithreading
    this.ifcViewer.IFC.properties.loader.ifcManager.useWebWorkers(true, '../assets/IFCWorker.js')

    this.ifcScene = this.ifcViewer.context.scene;
  }

  setupInputs() {
    if (!this.container) return;
    this.container.onclick = this.handleClick;
    this.container.ondblclick = this.handleDoubleClick;
    this.container.onmousemove = this.handleMouseMove;

    document.addEventListener('keydown', (event) => {
      this.customKeyControls(event);
    })
  }

  /////////////////////////////////////////////////////////////////////////
  // LOADERS
  async loadIfc(file: File) {
    this.ifcModel = await this.ifcViewer?.IFC.loadIfc(file);
    this.replaceOriginalModelBySubset(this.ifcModel, file.name)

    // const properties = this.ifcViewer?.IFC.getSpatialStructure(this.ifcModel.modelID);
  }

  ////////////////////////////////////////////////////////////////////////////
  // SUBSETS
  private getAllIds(ifcModel: any): number[]{
    return Array.from(
      new Set(ifcModel.geometry.attributes.expressID.array),
    );
  }

  private createModelSubset(ifcModel: any, subsetName: string) {
    const allIds = this.getAllIds(ifcModel);
    console.log('subset:' + subsetName);

    return this.ifcViewer?.IFC.loader.ifcManager.createSubset({
      modelID: ifcModel.modelID,
      ids: allIds,
      applyBVH: false,
      scene: ifcModel.parent,
      removePrevious: true,
      customID: subsetName
    });
  }

  private replaceOriginalModelBySubset(ifcModel: any, ifcModelName: string){
    this.modelSubset = this.createModelSubset(ifcModel, ifcModelName);
    this.toggleSubsetVisibility(ifcModel, false);
    
    this.toggleSubsetVisibility(this.modelSubset, true);
  }

  async showIfcSpaces(){
    const spaces = await this.ifcViewer?.IFC.getAllItemsOfType(0, IFCSPACE, false) as number[];
    console.log(spaces);

    const spaceMaterial = this.newMaterial(0x3984221, 50);
    const spacesSubset = this.ifcViewer?.IFC.loader.ifcManager.createSubset({
      modelID: this.ifcModel.modelID,
      ids: spaces,
      removePrevious: true,
      material: spaceMaterial
    })

    this.toggleSubsetVisibility(this.modelSubset, false);
    this.toggleSubsetVisibility(spacesSubset, true);
  }

  
  ////////////////////////////////////////////////////////////////////////////
  // VISIBILITY
  private toggleSubsetVisibility(subsetMesh: any, isVisible: boolean){
    if(!subsetMesh) return;

    const pickableIfcModels = this.ifcViewer?.context.items.pickableIfcModels;
    if(isVisible){
      this.ifcScene?.add(subsetMesh);
      pickableIfcModels?.push(subsetMesh);
    }else{
      subsetMesh.removeFromParent();
      pickableIfcModels?.splice(pickableIfcModels.indexOf(subsetMesh), 1);
    }
  }

  /////////////////////////////////////////////////////////////////////////
  // SELECTION
  select(modelID: number, expressID: number, pick = true) {
    if (pick)
      this.ifcViewer?.IFC.selector.pickIfcItemsByID(modelID, [expressID]);
    this.currentModel = modelID;
    this.onSelectActions.forEach((action) => action(modelID, expressID));
  }

  async pick() {
    const found = await this.ifcViewer?.IFC.selector.pickIfcItem(false, false);
    if (found == null || found == undefined) return;
    this.select(found.modelID, found.id, false);
  }

  /////////////////////////////////////////////////////////////////////////
  // CONTROLS
  private handleClick = async (_event: Event) => {
    await this.pick();
  };

  private handleDoubleClick = async (event: Event) => {
  };

  private handleMouseMove = (_event: Event) => {
    this.ifcViewer?.IFC.selector.prePickIfcItem();
  };

  private customKeyControls(event: KeyboardEvent) {
    if(event.key == "Escape"){
      this.ifcViewer?.IFC.selector.unpickIfcItems();
    }
  }

  /////////////////////////////////////////////////////////////////////////
  // ERRORS
  private notFoundError(item: string) {
    throw new Error(`ERROR: ${item} could not be found!`);
  }

  /////////////////////////////////////////////////////////////////////////
  // MATERIALS
  private newMaterial(color: number, opacity: number) {
    return new MeshLambertMaterial({
      color,
      opacity,
      transparent: false,
      depthTest: false,
      side: DoubleSide,
    });
  }
}
