import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * MatchSkeletonComponent
 *
 * Komponent wyświetlający placeholder podczas ładowania danych publicznego meczu.
 * Wykorzystuje PrimeNG Skeleton do stworzenia szkieletu odpowiadającego docelowemu layoutowi.
 */
@Component({
  selector: 'app-match-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  template: `
    <div class="container mx-auto p-4 md:p-6 lg:p-8">
      <!-- Skeleton dla sekcji hero -->
      <div class="bg-surface-ground rounded-lg p-6 mb-6">
        <p-skeleton width="10rem" height="1.5rem" styleClass="mb-4" />
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <p-skeleton width="12rem" height="2rem" />
          <p-skeleton width="8rem" height="3rem" />
          <p-skeleton width="12rem" height="2rem" />
        </div>
      </div>

      <!-- Skeleton dla tabeli setów -->
      <div class="bg-surface-card rounded-lg p-6 mb-6">
        <p-skeleton width="8rem" height="1.5rem" styleClass="mb-4" />
        <div class="space-y-3">
          <p-skeleton width="100%" height="3rem" />
          <p-skeleton width="100%" height="3rem" />
          <p-skeleton width="100%" height="3rem" />
        </div>
      </div>

      <!-- Skeleton dla sekcji uwag -->
      <div class="bg-surface-card rounded-lg p-6 mb-6">
        <p-skeleton width="10rem" height="1.5rem" styleClass="mb-4" />
        <p-skeleton width="100%" height="8rem" />
      </div>

      <!-- Skeleton dla sekcji raportu AI -->
      <div class="bg-surface-card rounded-lg p-6 mb-6">
        <p-skeleton width="10rem" height="1.5rem" styleClass="mb-4" />
        <p-skeleton width="100%" height="10rem" />
      </div>
    </div>
  `,
  styles: [],
})
/* eslint-disable @typescript-eslint/no-extraneous-class */
export class MatchSkeletonComponent {
  // Template-only component - all logic is handled in the template with PrimeNG Skeleton components
}

