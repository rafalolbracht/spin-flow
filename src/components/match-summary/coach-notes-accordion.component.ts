import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionModule } from 'primeng/accordion';
import type { SetDetailDto } from '@/types';

/**
 * CoachNotesAccordionComponent
 *
 * Accordion (PrimeNG p-accordion) prezentujący uwagi trenera:
 * - Panel "Uwagi do meczu" (zawsze pierwszy)
 * - Panele "Uwagi do seta X" (tylko dla setów z uwagami)
 *
 * Każda sekcja ma przycisk edycji.
 * Wszystkie panele domyślnie zwinięte.
 * Możliwość otwarcia wielu paneli jednocześnie.
 */
@Component({
  selector: 'app-coach-notes-accordion',
  standalone: true,
  imports: [CommonModule, AccordionModule],
  template: `
    <!-- Nagłówek sekcji -->
    <div class="section-header">
      <h3 class="section-title">Uwagi trenera</h3>
    </div>

    <!-- Accordion -->
    <p-accordion [multiple]="true">
      <!-- Panel uwag do meczu -->
      <p-accordion-panel value="match">
        <p-accordion-header>
          <span class="font-semibold text-surface-900">Uwagi do meczu</span>
        </p-accordion-header>
        <p-accordion-content>
          @if (matchNotes()) {
            <div class="prose prose-sm max-w-none text-surface-500 whitespace-pre-wrap">
              {{ matchNotes() }}
            </div>
          } @else {
            <p class="text-surface-500 italic m-0">Brak uwag trenera</p>
          }
        </p-accordion-content>
      </p-accordion-panel>

      <!-- Panele uwag do setów (tylko dla setów z uwagami) -->
      @for (set of setsWithNotes(); track set.id) {
        <p-accordion-panel [value]="'set-' + set.id">
          <p-accordion-header>
            <span class="font-semibold text-surface-900">Uwagi do seta {{ set.sequence_in_match }}</span>
          </p-accordion-header>
          <p-accordion-content>
            <div class="prose prose-sm max-w-none text-surface-500 whitespace-pre-wrap">
              {{ set.coach_notes }}
            </div>
          </p-accordion-content>
        </p-accordion-panel>
      }
    </p-accordion>
  `,
  styleUrl: './coach-notes-accordion.component.css',
})
export class CoachNotesAccordionComponent {
  // Props
  readonly matchNotes = input<string | null>(null);
  readonly sets = input.required<SetDetailDto[]>();

  /**
   * Zwraca sety z niepustymi uwagami
   */
  setsWithNotes(): SetDetailDto[] {
    return this.sets().filter((set) => set.coach_notes && set.coach_notes.trim() !== '');
  }
}

