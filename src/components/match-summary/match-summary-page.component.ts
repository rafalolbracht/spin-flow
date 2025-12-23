import { Component, inject, input, type OnInit, type OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService, ConfirmationService } from 'primeng/api';

// Shared components
import { AppLayoutComponent } from '@/components/shared/app-layout/app-layout.component';
import { SetsHistoryTableComponent } from '@/components/shared/sets-history-table.component';

// Local components
import { MatchHeaderSectionComponent } from './match-header-section.component';
import { CoachNotesAccordionComponent } from './coach-notes-accordion.component';
import { AiReportSectionComponent } from './ai-report-section.component';
import { ButtonModule } from 'primeng/button';

// Dialogs
import { ShareDialogComponent } from './dialogs/share-dialog.component';

// Services
import { MatchSummaryStateService } from './services/match-summary-state.service';
import { ThemeService } from '@/lib/services/theme.service';
import { PrimeNGThemeInitService } from '@/lib/config/primeng-theme-init.service';

/**
 * Props dla MatchSummaryPageComponent (dla Astro)
 */
export interface MatchSummaryPageComponentProps {
  matchId: number;
}

/**
 * MatchSummaryPageComponent
 *
 * Główny komponent standalone Angular zarządzający widokiem zakończonego meczu.
 * Odpowiada za inicjalizację danych, koordynację akcji użytkownika,
 * zarządzanie stanem i komunikację z API.
 * Zawiera AppLayoutComponent jako współdzielony element nawigacji.
 */
@Component({
  selector: 'app-match-summary-page',
  standalone: true,
  imports: [
    CommonModule,
    AppLayoutComponent,
    ToastModule,
    SkeletonModule,
    ButtonModule,
    SetsHistoryTableComponent,
    MatchHeaderSectionComponent,
    CoachNotesAccordionComponent,
    AiReportSectionComponent,
    ShareDialogComponent,
  ],
  templateUrl: './match-summary-page.component.html',
  styleUrl: './match-summary-page.component.css',
})
export class MatchSummaryPageComponent implements OnInit, OnDestroy {
  /**
   * Providery dla klienta Astro (analogjs pattern)
   * W architekturze Astro+Angular musimy dostarczyć serwisy na poziomie root komponentu
   */
  static clientProviders = [
    ...AppLayoutComponent.clientProviders,
    MessageService,
    ConfirmationService,
  ];

  // Injected services
  readonly themeService = inject(ThemeService);
  private readonly _themeInit = inject(PrimeNGThemeInitService);
  readonly store = inject(MatchSummaryStateService);
  private readonly messageService = inject(MessageService);

  // Input z Astro
  readonly matchId = input.required<number>();

  // Dane użytkownika (TODO: w przyszłości z AuthService)
  readonly userName = 'Jan Kowalski';
  readonly userInitials = 'JK';

  ngOnInit(): void {
    this.initializeMatch();
  }

  ngOnDestroy(): void {
    this.store.reset();
  }

  /**
   * Inicjalizacja - pobranie danych meczu
   */
  private initializeMatch(): void {
    const id = this.matchId();
    this.store.loadMatch(id);
  }

  /**
   * Sprawdza czy są jakiekolwiek uwagi (do meczu lub do setów)
   */
  hasAnyNotes(): boolean {
    // Sprawdź uwagi do meczu
    const notes = this.store.matchNotes();
    if (notes && notes.trim() !== '') {
      return true;
    }

    // Sprawdź uwagi do setów
    return this.store.sets().some(set => 
      set.coach_notes && set.coach_notes.trim() !== '',
    );
  }

  // =============================================================================
  // OBSŁUGA ZDARZEŃ - SEKCJE
  // =============================================================================

  /**
   * Obsługa kliknięcia odświeżenia raportu AI
   */
  onRefreshAiClicked(): void {
    this.store.refreshAiReport();
  }

  /**
   * Obsługa kliknięcia przycisku "Powrót do listy"
   */
  onBackToListClicked(): void {
    if (typeof window !== 'undefined') {
      window.location.href = '/matches';
    }
  }

  /**
   * Obsługa kliknięcia przycisku "Udostępnij mecz"
   */
  onShareClicked(): void {
    this.store.generatePublicShare();
  }

  // =============================================================================
  // OBSŁUGA ZDARZEŃ - DIALOG UDOSTĘPNIANIA
  // =============================================================================

  onShareDialogClose(): void {
    this.store.closeShareDialog();
  }
}

