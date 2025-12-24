import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

/**
 * NotFoundStateComponent
 *
 * Komponent wyświetlany gdy token jest nieprawidłowy lub mecz nie istnieje.
 * Oparty na wzorcu PrimeBlocks "Empty State" - centrowany na ekranie,
 * z ikoną, nagłówkiem i tekstem pomocniczym.
 */
@Component({
  selector: 'app-not-found-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen p-4">
      <div class="text-center max-w-md">
        <!-- Ikona błędu -->
        <i class="pi pi-exclamation-circle text-8xl text-surface-400 mb-6"></i>

        <!-- Nagłówek -->
        <h1 class="text-3xl font-bold text-surface-900 mb-4">Mecz nie istnieje</h1>

        <!-- Tekst pomocniczy -->
        <p class="text-lg text-surface-600 mb-8">
          Sprawdź poprawność linku lub skontaktuj się z osobą, która go udostępniła.
        </p>

        <!-- Opcjonalny link do strony głównej -->
        @if (showHomeLink()) {
          <a href="/" class="inline-block">
            <p-button
              label="Przejdź do strony głównej"
              icon="pi pi-home"
              [outlined]="true"
            />
          </a>
        }
      </div>
    </div>
  `,
  styles: [],
})
export class NotFoundStateComponent {
  readonly showHomeLink = input<boolean>(false);
}

