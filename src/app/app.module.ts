import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Singleton class that other classes use for dependency injection
import { IfcService } from './services/ifc.service';

import { AppComponent } from './app.component';
import { MainMenuComponent } from './main-menu/main-menu.component';

@NgModule({
  declarations: [AppComponent, MainMenuComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
  ],
  providers: [IfcService],
  bootstrap: [AppComponent],
})
export class AppModule {}
