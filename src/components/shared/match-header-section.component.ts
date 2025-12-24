import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * MatchHeaderSectionComponent
 *
 * Sekcja nagłówka meczu wyświetlająca:
 * - Nazwy zawodników (player i opponent)
 * - Wynik setowy (X : Y)
 * - Datę i godzinę startu (sformatowana lokalnie)
 * - Przycisk edycji
 *
 * Zbudowana jako p-card z PrimeNG.
 */
@Component({
  selector: 'app-match-header-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="match-header-card">
      <!-- Wynik setowy i zawodnicy -->
      <div class="score-display">
        <!-- Kolumna zawodnika -->
        <div class="player-column">
          <div class="player-name">{{ playerName() }}</div>
          <div class="score-row">
            <div class="sets-won-badge player-badge">{{ setsWonPlayer() }}</div>
          </div>
        </div>

        <!-- Kolumna rywala -->
        <div class="opponent-column">
          <div class="opponent-name">{{ opponentName() }}</div>
          <div class="score-row">
            <div class="sets-won-badge opponent-badge">{{ setsWonOpponent() }}</div>
          </div>
        </div>
      </div>

      <!-- Data i godzina -->
      <div class="match-date">
        {{ formattedStartDate() }}
      </div>
    </div>
  `,
  styleUrl: './match-header-section.component.css',
})
export class MatchHeaderSectionComponent {
  // Props
  readonly playerName = input.required<string>();
  readonly opponentName = input.required<string>();
  readonly setsWonPlayer = input.required<number>();
  readonly setsWonOpponent = input.required<number>();
  readonly startedAt = input.required<string>();

  /**
   * Formatuje datę startu w lokalnej strefie czasowej
   * Format: "15 stycznia 2024, 14:30"
   */
  formattedStartDate(): string {
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
  }
}

