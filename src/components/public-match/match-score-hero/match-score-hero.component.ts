import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * MatchScoreHeroComponent
 *
 * Sekcja hero prezentująca podstawowe informacje o meczu w atrakcyjnej formie.
 * Inspirowana wzorcem PrimeBlocks "Stats" i "Hero sections".
 * Wyświetla nazwy zawodników, wynik setowy jako główną statystykę oraz datę meczu.
 *
 * Layout responsywny: na mobile nazwy nad/pod wynikiem, na desktop obok.
 */
@Component({
  selector: 'app-match-score-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-score-hero.component.html',
  styleUrl: './match-score-hero.component.css',
})
export class MatchScoreHeroComponent {
  // Props
  readonly playerName = input.required<string>();
  readonly opponentName = input.required<string>();
  readonly startedAt = input.required<string>();
  readonly setsWonPlayer = input.required<number>();
  readonly setsWonOpponent = input.required<number>();

  /**
   * Formatuje datę startu w lokalnej strefie czasowej
   * Format: "15 stycznia 2024, 14:30"
   */
  readonly formattedStartDate = computed(() => {
    try {
      const date = new Date(this.startedAt());
      return new Intl.DateTimeFormat('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return this.startedAt();
    }
  });
}

