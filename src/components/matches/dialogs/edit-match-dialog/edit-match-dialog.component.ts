import { Component, input, output, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

// PrimeNG Modules
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';

/**
 * Dialog do edycji nazw zawodników w meczu
 *
 * Komponent prezentuje formularz reaktywny z walidacją do edycji
 * player_name i opponent_name. Używany w widoku listy meczów.
 */
@Component({
  selector: 'app-edit-match-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    MessageModule,
  ],
  templateUrl: './edit-match-dialog.component.html',
  styleUrl: './edit-match-dialog.component.css',
})
export class EditMatchDialogComponent {
  private readonly fb = inject(FormBuilder);

  // Inputs
  readonly visible = input.required<boolean>();
  readonly playerName = input<string>('');
  readonly opponentName = input<string>('');
  readonly isLoading = input<boolean>(false);

  // Outputs
  readonly dialogClose = output();
  readonly confirmClicked = output<{
    playerName: string;
    opponentName: string;
  }>();

  // Formularz
  readonly editForm: FormGroup;

  constructor() {
    // Inicjalizacja formularza
    this.editForm = this.fb.group({
      playerName: [
        '',
        [Validators.required, Validators.minLength(1), Validators.maxLength(200)],
      ],
      opponentName: [
        '',
        [Validators.required, Validators.minLength(1), Validators.maxLength(200)],
      ],
    });

    // Aktualizacja wartości formularza gdy dialog się otwiera
    effect(() => {
      if (this.visible() && this.playerName() && this.opponentName()) {
        this.editForm.patchValue({
          playerName: this.playerName(),
          opponentName: this.opponentName(),
        });
      }
    });

    // Kontrola disabled/enabled stanu formularza
    effect(() => {
      if (this.isLoading()) {
        this.editForm.disable();
      } else {
        this.editForm.enable();
      }
    });
  }

  /**
   * Obsługuje zmianę widoczności dialogu (przycisk X, Escape lub Anuluj)
   * Wzorowane na ShareDialogComponent
   */
  onVisibleChange(isVisible: boolean): void {
    if (!isVisible) {
      this.editForm.reset();
      this.dialogClose.emit();
    }
  }

  /**
   * Obsługa zapisania zmian
   */
  onConfirm(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formValue = this.editForm.value;
    this.confirmClicked.emit({
      playerName: formValue.playerName.trim(),
      opponentName: formValue.opponentName.trim(),
    });
    // Dialog zostanie zamknięty przez parent po pomyślnym zapisie
  }

  /**
   * Sprawdzenie czy pole ma błąd walidacji i zostało dotknięte
   */
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field?.hasError(errorType) && field?.touched);
  }

  /**
   * Sprawdzenie czy formularz jest nieprawidłowy i dotknięty
   */
  isFormInvalid(): boolean {
    return this.editForm.invalid && this.editForm.touched;
  }
}

