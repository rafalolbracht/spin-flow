// src/components/counter.component.ts
import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";

@Component({
  selector: "app-counter",
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  template: `
    <p-card class="w-full max-w-md">
      <ng-template pTemplate="header">
        <div class="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
          <h3 class="text-xl font-bold">Licznik PrimeNG</h3>
        </div>
      </ng-template>

      <div class="flex items-center justify-between gap-4">
        <span class="text-lg font-semibold"> Licznik: {{ count() }} </span>

        <p-button label="+1" icon="pi pi-plus" (click)="increment()" styleClass="p-button-success"></p-button>
      </div>
    </p-card>
  `,
})
export class CounterComponent {
  readonly count = signal(0);

  increment() {
    this.count.update((value) => value + 1);
  }
}
