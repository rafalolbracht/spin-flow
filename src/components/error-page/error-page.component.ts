import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

import type { ErrorType } from './error-page.types';
import { ERROR_PAGE_CONFIGS } from './error-page.config';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    RippleModule,
  ],
  templateUrl: './error-page.component.html',
})
export class ErrorPageComponent {
  /**
   * Input signal z typem błędu (domyślnie 'not_found')
   */
  errorType = input<ErrorType>('not_found');

  /**
   * Input signal z opcjonalnym niestandardowym komunikatem
   */
  customMessage = input<string | undefined>(undefined);

  /**
   * Computed signal zwracający odpowiednią konfigurację na podstawie errorType
   */
  config = computed(() => {
    // Pobierz bazową konfigurację z ERROR_PAGE_CONFIGS na podstawie errorType
    const baseConfig = ERROR_PAGE_CONFIGS[this.errorType()];

    // Jeśli customMessage jest zdefiniowany, nadpisz pole description w konfiguracji
    if (this.customMessage() !== undefined) {
      return {
        ...baseConfig,
        description: this.customMessage(),
      };
    }

    // Zwróć finalną konfigurację
    return baseConfig;
  });
}
