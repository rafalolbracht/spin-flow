import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabelModule } from 'primeng/floatlabel';

/**
 * FinishMatchDialog
 *
 * Modal PrimeNG Dialog do zakończenia meczu z opcjonalnymi uwagami trenera.
 */
@Component({
  selector: 'app-finish-match-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule,
    FloatLabelModule,
  ],
  templateUrl: './finish-match-dialog.component.html',
  styleUrl: './finish-match-dialog.component.css',
})
export class FinishMatchDialogComponent {
  // Props
  readonly visible = input.required<boolean>();
  readonly playerName = input.required<string>();
  readonly opponentName = input.required<string>();
  readonly setsWonPlayer = input.required<number>();
  readonly setsWonOpponent = input.required<number>();
  readonly generateAiSummary = input.required<boolean>();
  readonly isLoading = input<boolean>(false);

  // Events
  readonly dialogCancel = output();
  readonly confirm = output<string | null>();

  // Local state
  coachNotes = '';

  /**
   * Maksymalna długość uwag
   */
  readonly MAX_NOTES_LENGTH = 5000;

  /**
   * Obsługuje anulowanie
   */
  onCancel(): void {
    this.coachNotes = '';
    this.dialogCancel.emit();
  }

  /**
   * Obsługuje potwierdzenie
   */
  onConfirm(): void {
    if (this.isValid()) {
      const notes = this.coachNotes.trim();
      this.confirm.emit(notes.length > 0 ? notes : null);
      this.coachNotes = '';
    }
  }

  /**
   * Walidacja długości uwag
   */
  isValid(): boolean {
    return this.coachNotes.length <= this.MAX_NOTES_LENGTH;
  }

  /**
   * Zwraca komunikat błędu walidacji
   */
  getValidationError(): string | null {
    if (this.coachNotes.length > this.MAX_NOTES_LENGTH) {
      return `Uwagi nie mogą przekraczać ${this.MAX_NOTES_LENGTH} znaków`;
    }
    return null;
  }

  /**
   * Obsługuje zmianę widoczności dialogu
   */
  onVisibleChange(isVisible: boolean): void {
    if (!isVisible) {
      this.onCancel();
    }
  }

  /**
   * Zwraca nazwę zwycięzcy
   */
  getWinnerName(): string {
    return this.setsWonPlayer() > this.setsWonOpponent()
      ? this.playerName()
      : this.opponentName();
  }
}

