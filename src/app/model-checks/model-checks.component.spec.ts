import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelChecksComponent } from './model-checks.component';

describe('ModelChecksComponent', () => {
  let component: ModelChecksComponent;
  let fixture: ComponentFixture<ModelChecksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModelChecksComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModelChecksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
