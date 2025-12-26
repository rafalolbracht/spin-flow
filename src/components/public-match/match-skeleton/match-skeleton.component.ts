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
  templateUrl: './match-skeleton.component.html',
})
/* eslint-disable @typescript-eslint/no-extraneous-class */
export class MatchSkeletonComponent {
  // Template-only component - all logic is handled in the template with PrimeNG Skeleton components
}

