import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { SideEnum, SetDetailDto } from '@/types';

/**
 * ScoreDisplayCard
 *
 * Karta wyświetlająca aktualny wynik meczu i seta oraz wskazująca serwującego.
 * Centrum wizualne widoku, widoczne bez scrollowania.
 * Wykorzystuje PrimeNG Card, Tag i custom styling.
 */
@Component({
  selector: 'app-score-display-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './score-display-card.component.html',
  styleUrl: './score-display-card.component.css',
})
export class ScoreDisplayCardComponent {
  // Props
  readonly playerName = input.required<string>();
  readonly opponentName = input.required<string>();
  readonly setsWonPlayer = input.required<number>();
  readonly setsWonOpponent = input.required<number>();
  readonly setScorePlayer = input.required<number>();
  readonly setScoreOpponent = input.required<number>();
  readonly currentServer = input.required<SideEnum>();
  readonly currentSetNumber = input.required<number>();
  readonly sets = input<SetDetailDto[]>();

  /**
   * Sprawdza czy zawodnik aktualnie serwuje
   */
  isPlayerServing(): boolean {
    return this.currentServer() === 'player';
  }

  /**
   * Sprawdza czy rywal aktualnie serwuje
   */
  isOpponentServing(): boolean {
    return this.currentServer() === 'opponent';
  }

  /**
   * Zwraca wynik seta dla danego gracza
   * @param setIndex - indeks seta (0-based)
   * @param side - strona gracza
   */
  getSetScore(setIndex: number, side: 'player' | 'opponent'): number {
    const sets = this.sets?.() || [];
    if (setIndex >= sets.length) return 0;
    const set = sets[setIndex];
    return side === 'player' ? set.set_score_player : set.set_score_opponent;
  }
}

