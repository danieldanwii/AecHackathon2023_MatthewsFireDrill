import { Component, NgModule, ViewChild, ElementRef, OnInit} from '@angular/core';

import { IfcService } from '../services/ifc.service';

@Component({
  selector: 'app-main-menu',
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.css'],
})
export class MainMenuComponent implements OnInit{
  floorplans: any;

  constructor(private ifcService: IfcService) {
    this.floorplans = this.ifcService.floorplans;
  }

  ngOnInit(){
    this.ifcService.floorplansUpdated.subscribe((updatedFloorsplans) => {
      this.floorplans = updatedFloorsplans;
    })
  }

  @ViewChild('openIfcFile', {static: false}) openIfcFile?: ElementRef;
  @ViewChild('openProject', {static: false}) openProject?: ElementRef;

  onOpenIfcFile(){
    this.openIfcFile?.nativeElement.addEventListener('change', (event: Event) => {
      const target = event.target as HTMLInputElement;

      if(!target.files) return;

      const ifcFile: File = target.files[0];
      this.ifcService.loadIfc(ifcFile);
    })
  }

  showFloorPlan(floorplan: string){
    this.ifcService.showFloorPlan(floorplan);
  }

  onGetSpaces(){
    this.ifcService.showIfcSpaces();
  }

  onShowNavMeshItems(){
    this.ifcService.showFloorsDoorsAndStairs();
  }
  
}
