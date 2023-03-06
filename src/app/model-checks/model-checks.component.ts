import { Component } from '@angular/core';
import { IfcService } from '../services/ifc.service';

@Component({
  selector: 'app-model-checks',
  templateUrl: './model-checks.component.html',
  styleUrls: ['./model-checks.component.css']
})
export class ModelChecksComponent {
  criticalRoom: number | undefined;
  exits: number | undefined;

  constructor(private ifcService: IfcService){

  }

  async onAreaClick(){
    this.criticalRoom = await this.ifcService.checkRoomSizes();
  }

  async onExitsClick(){
    this.criticalRoom = undefined;

    this.exits = await this.ifcService.checkExits();
  }

}
