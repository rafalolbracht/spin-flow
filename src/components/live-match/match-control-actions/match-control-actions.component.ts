import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * MatchControlActions
 *
 * Grupa przycisków akcji kontrolujących przebieg meczu:
 * cofnij punkt, zakończ set, zakończ mecz.
 * Przyciski mają warunki aktywacji.
 */
@Component({
  selector: 'app-match-control-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-control-actions.component.html',
  styleUrl: './match-control-actions.component.css',
})
export class MatchControlActionsComponent {
  // Props
  readonly canUndoPoint = input.required<boolean>();
  readonly canFinishSet = input.required<boolean>();
  readonly canFinishMatch = input.required<boolean>();
  readonly disabled = input<boolean>(false);

  // Events
  readonly undoPoint = output();
  readonly finishSet = output();
  readonly finishMatch = output();

  /**
   * Emituje zdarzenie cofnięcia punktu
   */
  onUndoPoint(): void {
    if (this.canUndoPoint() && !this.disabled()) {
      this.undoPoint.emit();
    }
  }

  /**
   * Emituje zdarzenie żądania zakończenia seta
   */
  onFinishSet(): void {
    if (this.canFinishSet() && !this.disabled()) {
      this.finishSet.emit();
    }
  }

  /**
   * Emituje zdarzenie żądania zakończenia meczu
   */
  onFinishMatch(): void {
    if (this.canFinishMatch() && !this.disabled()) {
      this.finishMatch.emit();
    }
  }

  /**
   * Oblicza czy przycisk cofnij jest disabled
   */
  isUndoDisabled(): boolean {
    return !this.canUndoPoint() || this.disabled();
  }

  /**
   * Oblicza czy przycisk zakończ set jest disabled
   */
  isFinishSetDisabled(): boolean {
    return !this.canFinishSet() || this.disabled();
  }

  /**
   * Oblicza czy przycisk zakończ mecz jest disabled
   */
  isFinishMatchDisabled(): boolean {
    return !this.canFinishMatch() || this.disabled();
  }
}

