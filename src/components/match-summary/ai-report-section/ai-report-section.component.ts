import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import type { AiReportDto } from '@/types';
import type { AiReportState } from '../services/match-summary-state.service';

/**
 * AiReportSectionComponent
 *
 * Sekcja prezentująca raport AI z trzema możliwymi stanami:
 * - pending: spinner + tekst "Generowanie raportu AI..." + przycisk "Sprawdź status"
 * - success: opis meczu + zalecenia treningowe (bez przycisku odświeżania)
 * - error: komunikat błędu + przycisk "Spróbuj ponownie"
 * - hidden: komponent nie renderowany (AI wyłączone)
 *
 * Przycisk odświeżania widoczny tylko dla statusów 'error' i 'pending'.
 */
@Component({
  selector: 'app-ai-report-section',
  standalone: true,
  imports: [
    CommonModule,
    PanelModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule,
  ],
  templateUrl: './ai-report-section.component.html',
  styleUrl: './ai-report-section.component.css',
})
export class AiReportSectionComponent {
  // Props
  readonly report = input<AiReportDto | null>(null);
  readonly isAiEnabled = input.required<boolean>();
  readonly isRefreshing = input<boolean>(false);

  // Outputs
  readonly refreshClicked = output();

  /**
   * Stan raportu AI obliczony z propsów
   */
  readonly aiReportState = computed<AiReportState>(() => {
    if (!this.isAiEnabled()) {
      return 'hidden';
    }

    const rep = this.report();
    if (!rep) {
      return 'pending';
    }

    return rep.ai_status as AiReportState;
  });
}

