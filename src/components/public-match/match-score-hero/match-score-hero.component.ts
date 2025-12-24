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
  template: `
    <div class="hero-container">
      <!-- Data i godzina startu -->
      <div class="match-date">
        <i class="pi pi-calendar text-surface-500 mr-2"></i>
        <span class="text-surface-600">{{ formattedStartDate() }}</span>
      </div>

      <!-- Główna sekcja wyniku -->
      <div class="score-section">
        <!-- Desktop layout -->
        <div class="desktop-layout hidden md:grid">
          <!-- Nazwa zawodnika (lewa strona) -->
          <div class="player-info player-side">
            <span class="player-name player-color">{{ playerName() }}</span>
          </div>

          <!-- Wynik setowy (centrum) -->
          <div class="score-display">
            <span class="sets-won player-color">{{ setsWonPlayer() }}</span>
            <span class="score-separator">:</span>
            <span class="sets-won opponent-color">{{ setsWonOpponent() }}</span>
          </div>

          <!-- Nazwa rywala (prawa strona) -->
          <div class="player-info opponent-side">
            <span class="player-name opponent-color">{{ opponentName() }}</span>
          </div>
        </div>

        <!-- Mobile layout -->
        <div class="mobile-layout md:hidden">
          <!-- Nazwa zawodnika (góra) -->
          <div class="player-info-mobile">
            <span class="player-name player-color">{{ playerName() }}</span>
          </div>

          <!-- Wynik setowy (centrum) -->
          <div class="score-display-mobile">
            <span class="sets-won player-color">{{ setsWonPlayer() }}</span>
            <span class="score-separator">:</span>
            <span class="sets-won opponent-color">{{ setsWonOpponent() }}</span>
          </div>

          <!-- Nazwa rywala (dół) -->
          <div class="player-info-mobile">
            <span class="player-name opponent-color">{{ opponentName() }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
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

