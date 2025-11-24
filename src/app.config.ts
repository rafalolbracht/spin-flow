// src/app.config.ts
import type { ApplicationConfig } from "@angular/core";
import { provideZonelessChangeDetection } from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";

// PrimeNG Configuration for version 20+
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    // PrimeNG providers will be added here when needed
  ],
};
