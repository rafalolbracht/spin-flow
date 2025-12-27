import { Component, input, output, computed, type OnInit, type OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { interval, Subscription } from 'rxjs';
import type { AiReportDto } from '@/types';
import type { AiReportState } from '../services/match-summary-state.service';

/**
 * AiReportSectionComponent
 *
 * Sekcja prezentująca raport AI z trzema możliwymi stanami:
 * - pending: spinner + tekst "Generowanie raportu AI..." + przycisk "Sprawdź status"
 *   + automatyczne odświeżanie co 3 sekundy
 * - success: opis meczu + zalecenia treningowe (bez przycisku odświeżania)
 * - error: komunikat błędu + przycisk "Spróbuj ponownie"
 * - hidden: komponent nie renderowany (AI wyłączone)
 *
 * Przycisk odświeżania widoczny tylko dla statusów 'error' i 'pending'.
 * Gdy status to 'pending', komponent automatycznie próbuje odświeżyć raport co 3 sekundy.
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
export class AiReportSectionComponent implements OnInit, OnDestroy {
  // Props
  readonly report = input<AiReportDto | null>(null);
  readonly isAiEnabled = input.required<boolean>();
  readonly isRefreshing = input<boolean>(false);

  // Outputs
  readonly refreshClicked = output();
  readonly autoRefreshClicked = output();

  // Private properties for auto-refresh
  private autoRefreshSubscription?: Subscription;

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

  constructor() {
    // Reaguj na zmiany stanu raportu AI
    effect(() => {
      const currentState = this.aiReportState();
      if (currentState === 'pending') {
        this.startAutoRefreshIfPending();
      } else {
        this.stopAutoRefresh();
      }
    });
  }

  ngOnInit(): void {
    this.startAutoRefreshIfPending();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  /**
   * Rozpoczyna automatyczne odświeżanie jeśli status to 'pending'
   */
  private startAutoRefreshIfPending(): void {
    // Najpierw zatrzymaj istniejący timer
    this.stopAutoRefresh();

    // Sprawdź czy status to 'pending'
    if (this.aiReportState() === 'pending') {
      // Rozpocznij odświeżanie co 3 sekundy
      this.autoRefreshSubscription = interval(3000).subscribe(() => {
        // Sprawdź ponownie status przed każdą próbą odświeżenia
        if (this.aiReportState() === 'pending') {
          this.autoRefreshClicked.emit();
        } else {
          // Jeśli status się zmienił, zatrzymaj timer
          this.stopAutoRefresh();
        }
      });
    }
  }

  /**
   * Zatrzymuje automatyczne odświeżanie
   */
  private stopAutoRefresh(): void {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
      this.autoRefreshSubscription = undefined;
    }
  }
}

