import { Color, DoubleSide, MeshLambertMaterial, MeshBasicMaterial, LineBasicMaterial } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { IFCLoader } from 'web-ifc-three/IFCLoader';
import { IfcScene } from 'web-ifc-viewer/dist/components/context/scene';
import { EventEmitter } from '@angular/core';

import { 
  IFCWALL,
  IFCSLAB,
  IFCDOOR,
  IFCSPACE,
  IFCSTAIR,
  IFCWALLSTANDARDCASE } from 'web-ifc'
import { IfcObject } from './ifcObject.model';

export class IfcService {
  ifcViewer?: IfcViewerAPI;
  container?: HTMLElement;
  witIfcLoader?: IFCLoader;
  ifcScene?: IfcScene;
  
  ifcProductsType: { [modelID: number]: { [expressID: number]: number } };
  ifcModel: any;

  floorplans: string[] | undefined = ['No project loaded!'];
  floorplansUpdated = new EventEmitter<any>();

  navMesh: any;
  gltfLoader = this.ifcViewer?.GLTF

  selectedObject: IfcObject | null = null;

  modelSubset: any;
  navMeshSubset: any;


  constructor() {
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
    const backgroundColor = new Color(120, 120, 120);
    this.ifcViewer = new IfcViewerAPI({
      container: this.container,
      preselectMaterial,
      selectMaterial,
      backgroundColor
    });

    this.ifcViewer.axes.setAxes();
    this.ifcViewer.grid.setGrid(5, 5);

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
    this.ifcModel = await this.ifcViewer?.IFC.loadIfc(file, true);
    this.replaceOriginalModelBySubset(this.ifcModel, file.name);

    this.generateFloorPlans();

    // const properties = this.ifcViewer?.IFC.getSpatialStructure(this.ifcModel.modelID);
  }

  async loadGLTF(file: File){
    const url = URL.createObjectURL(file);

    this.navMesh = await this.ifcViewer?.GLTF.load(url);
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

  ////////////////////////////////////////////////////////////////////////////
  // PROPERTIES
  async logProperties(ifcObject: IfcObject){
    const properties = await this.ifcViewer?.IFC.getProperties(ifcObject.modelID, ifcObject.id, true, true);
    console.log(properties);

  }


  /////////////////////////////////////////////////////////////////////////
  // GLTF
  async createGltfForNavMesh(file: File){
    const url = URL.createObjectURL(file);

    const result = await this.ifcViewer?.GLTF.exportIfcFileAsGltf({
      ifcFileUrl: url,
      splitByFloors: true,
      categories: {
          walls: [IFCWALL, IFCWALLSTANDARDCASE],
          slabs: [IFCSLAB],
          doors: [IFCDOOR],
          stairs: [IFCSTAIR]
      },
      getProperties: false
    });

    if(!result) return;

    // Download result
    const link = document.createElement('a');
    document.body.appendChild(link);

    for(const categoryName in result.gltf) {
        const category = result.gltf[categoryName];
        for(const levelName in category) {
            const file = category[levelName].file;
            if(file) {
                link.download = `${file.name}_${categoryName}_${levelName}.gltf`;
                link.href = URL.createObjectURL(file);
                link.click();
            }
        }
    }

    for(let jsonFile of result.json) {
        link.download = `${jsonFile.name}.json`;
        link.href = URL.createObjectURL(jsonFile);
        link.click();
    }

    link.remove();
  }

  /////////////////////////////////////////////////////////////////////////
  // CHECK FUNCTIONS
  async checkRoomSizes(){
    const spaces = await this.ifcViewer?.IFC.getAllItemsOfType(0, IFCSPACE, false);
    console.log('Ifc spaces:')
    console.log(spaces);

    //TODO: Parse actual ifc file
    // We know that room with id 246 is the critical
    const criticalRoom = 246;

    this.select(this.ifcModel.modelID, criticalRoom);
    this.showFloorPlan('102');

    return criticalRoom;
  }

  async checkExits(){
    this.ifcViewer?.IFC.selector.unpickIfcItems();
    const exits = 3729;

    this.select(this.ifcModel.modelID, exits);
    this.showFloorPlan('102');

    return exits;
  }

  /////////////////////////////////////////////////////////////////////////
  // FLOOR PLANS
  async generateFloorPlans(){
    await this.ifcViewer?.plans.computeAllPlanViews(this.ifcModel.modelID);

    const lineMaterial = new LineBasicMaterial({ color: 'black' });
    const baseMaterial = new MeshBasicMaterial({
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    await this.ifcViewer?.edges.create('planview', this.ifcModel.modelID, lineMaterial, baseMaterial);

    this.floorplans = this.ifcViewer?.plans.getAll(this.ifcModel.modelID);
    this.floorplansUpdated.emit(this.floorplans);
  }

  showFloorPlan(floorplan: string){
    this.ifcViewer?.plans.goTo(this.ifcModel.modelID, floorplan);
    this.ifcViewer?.edges.toggle('planview', true);
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

  async showIfcSpaces(){
    const spaces = await this.ifcViewer?.IFC.getAllItemsOfType(0, IFCSPACE, false) as number[];

    const spaceMaterial = this.newMaterial(0xfbc02d, 50);
    const spacesSubset = this.ifcViewer?.IFC.loader.ifcManager.createSubset({
      modelID: this.ifcModel.modelID,
      ids: spaces,
      removePrevious: true,
      material: spaceMaterial
    })

    this.toggleSubsetVisibility(this.modelSubset, false);
    this.toggleSubsetVisibility(spacesSubset, true);
  }

  async showFloorsDoorsAndStairs(){
    const navMeshItems = [];

    const floors = await this.ifcViewer?.IFC.getAllItemsOfType(0, IFCSLAB, false) as number[];
    navMeshItems.push(floors);
    
    const doors = await this.ifcViewer?.IFC.getAllItemsOfType(0, IFCDOOR, false) as number[];
    navMeshItems.push(doors);
    
    const stairs = await this.ifcViewer?.IFC.getAllItemsOfType(0, IFCSTAIR, false) as number[];
    navMeshItems.push(stairs);
    
    const walls = await this.ifcViewer?.IFC.getAllItemsOfType(0, IFCWALL, false) as number[];
    navMeshItems.push(walls);

    console.log(navMeshItems);

    const navMeshSubsetName = 'navMeshSubset';
    navMeshItems.forEach((category) => {
      this.navMeshSubset = this.ifcViewer?.IFC.loader.ifcManager.createSubset({
        modelID: this.ifcModel.modelID,
        ids: category,
        removePrevious: false,
        customID: navMeshSubsetName
      })
    })

    this.toggleSubsetVisibility(this.modelSubset, false);
    this.toggleSubsetVisibility(this.navMeshSubset, true);
  }

  /////////////////////////////////////////////////////////////////////////
  // SELECTION
  select(modelID: number, expressID: number, pick = true) {
    if (pick)
      this.ifcViewer?.IFC.selector.pickIfcItemsByID(modelID, [expressID]);
    this.selectedObject = new IfcObject(modelID, expressID);
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
    
    if(event.key == "p"){
      if(!this.selectedObject) return;
      this.logProperties(this.selectedObject);
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
      transparent: true,
      depthTest: false,
      side: DoubleSide,
    });
  }
}
