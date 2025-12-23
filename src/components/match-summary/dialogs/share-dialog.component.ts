import { Component, input, output, inject, effect, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

/**
 * ShareDialogComponent
 *
 * Modal z wygenerowanym linkiem publicznym i przyciskiem do kopiowania.
 * Zbudowany na p-dialog z PrimeNG.
 */
@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputGroupModule,
    TooltipModule,
  ],
  templateUrl: './share-dialog.component.html',
  styleUrl: './share-dialog.component.css',
})
export class ShareDialogComponent {
  private readonly messageService = inject(MessageService);

  // ViewChild dla inputa z linkiem
  readonly urlInput = viewChild<ElementRef<HTMLInputElement>>('urlInput');

  // Props
  readonly visible = input.required<boolean>();
  readonly publicUrl = input<string | null>(null);
  readonly isLoading = input<boolean>(false);

  // Events
  readonly dialogClose = output();

  constructor() {
    // Gdy pojawi się link, ustaw scroll na początek
    effect(() => {
      const url = this.publicUrl();
      const input = this.urlInput()?.nativeElement;
      
      if (url && input) {
        // Mały timeout żeby DOM zdążył się zaktualizować
        setTimeout(() => {
          input.setSelectionRange(0, 0);
          input.scrollLeft = 0;
        }, 0);
      }
    });
  }

  /**
   * Kopiuje URL do schowka
   */
  onCopyClick(): void {
    const url = this.publicUrl();
    if (!url) return;

    // Nowoczesne API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Skopiowano',
            detail: 'Link został skopiowany do schowka',
            life: 2000,
          });
        })
        .catch(() => {
          this.fallbackCopy(url);
        });
    } else {
      // Fallback dla starszych przeglądarek
      this.fallbackCopy(url);
    }
  }

  /**
   * Fallback do kopiowania dla starszych przeglądarek
   */
  private fallbackCopy(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      this.messageService.add({
        severity: 'success',
        summary: 'Skopiowano',
        detail: 'Link został skopiowany do schowka',
        life: 2000,
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się skopiować linku',
        life: 3000,
      });
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Obsługuje zmianę widoczności dialogu
   */
  onVisibleChange(isVisible: boolean): void {
    if (!isVisible) {
      this.dialogClose.emit();
    }
  }

  /**
   * Obsługuje kliknięcie w pole z linkiem - ustawia kursor na początek
   */
  onInputClick(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      // Ustaw kursor na początek i pokaż początek tekstu
      input.setSelectionRange(0, 0);
      input.scrollLeft = 0;
    }
  }
}
