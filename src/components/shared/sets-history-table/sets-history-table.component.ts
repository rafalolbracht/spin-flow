import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { SetDetailDto } from '@/types';

/**
 * SetsHistoryTable (współdzielony)
 *
 * Kompaktowa tabela wyświetlająca historię setów w formacie:
 * - Kolumny: numery setów (1, 2, 3, ...)
 * - Wiersze: gracze (wyniki w poszczególnych setach)
 * - Wyróżnienie: pomarańczowy bold dla wygranych setów, szary dla przegranych
 * - Bieżący set: czerwone obramowanie kolumny (jeśli podano currentSetId)
 *
 * Komponent współdzielony między widokami "W toku" (Live Match) i "Match Summary".
 */
@Component({
  selector: 'app-sets-history-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sets-history-table.component.html',
  styleUrl: './sets-history-table.component.css',
})
export class SetsHistoryTableComponent {
  // Props
  readonly sets = input.required<SetDetailDto[]>();
  readonly currentSetId = input<number | null>(null);
  readonly playerName = input.required<string>();
  readonly opponentName = input.required<string>();

  /**
   * Sortowane sety według sequence_in_match
   * Używamy set.id jako track key dla Angular @for
   */
  readonly sortedSets = computed(() => {
    const sets = this.sets();
    return [...sets].sort((a, b) => a.sequence_in_match - b.sequence_in_match);
  });

  /**
   * Sprawdza czy set jest bieżącym setem
   */
  isCurrentSet(setId: number): boolean {
    const current = this.currentSetId();
    return current !== null && current === setId;
  }

  /**
   * Zwraca klasę CSS dla komórki wyniku gracza
   */
  getPlayerScoreClass(set: SetDetailDto): string {
    if (!set.is_finished) {
      return 'score-cell in-progress';
    }
    return set.winner === 'player' ? 'score-cell winner player' : 'score-cell loser';
  }

  /**
   * Zwraca klasę CSS dla komórki wyniku rywala
   */
  getOpponentScoreClass(set: SetDetailDto): string {
    if (!set.is_finished) {
      return 'score-cell in-progress';
    }
    return set.winner === 'opponent' ? 'score-cell winner opponent' : 'score-cell loser';
  }
}
