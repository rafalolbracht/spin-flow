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
  templateUrl: './coach-notes-accordion.component.html',
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

