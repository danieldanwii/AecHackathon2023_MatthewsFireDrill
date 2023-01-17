import { Component, AfterContentInit, ViewChild, ElementRef, HostListener } from '@angular/core';

import { IfcService } from './services/ifc.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterContentInit {
  title = 'ifcjs-angular-example';
  ifc: IfcService;

  @ViewChild('threeContainer', { static: true }) container?: ElementRef;

  constructor(service: IfcService) {
    this.ifc = service;
  }

  ngAfterContentInit() {
    const container = this.getContainer();
    if (container) this.ifc.startIfcViewer(container);
  }

  private getContainer() {
    if (!this.container) return null;
    return this.container.nativeElement as HTMLElement;
  }
}
