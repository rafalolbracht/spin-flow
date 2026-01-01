import { Component, inject, input, computed, type OnInit, type OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { BlockUIModule } from 'primeng/blockui';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, ConfirmationService } from 'primeng/api';

// Shared components
import { AppLayoutComponent } from '@/components/shared/app-layout/app-layout.component';
import { SetsHistoryTableComponent } from '@/components/shared/sets-history-table/sets-history-table.component';

// Local components
import { ScoreDisplayCardComponent } from '../score-display-card/score-display-card.component';
import { TagSelectionPanelComponent } from '../tag-selection-panel/tag-selection-panel.component';
import { PointScoringButtonsComponent } from '../point-scoring-buttons/point-scoring-buttons.component';
import { MatchControlActionsComponent } from '../match-control-actions/match-control-actions.component';
import { FinishSetDialogComponent } from '../finish-set-dialog/finish-set-dialog.component';
import { FinishMatchDialogComponent } from '../finish-match-dialog/finish-match-dialog.component';

// Services
import { LiveMatchStoreService } from '../services/live-match-store.service';
import { ThemeService } from '@/lib/services/theme.service';
import { PrimeNGThemeInitService } from '@/lib/config/primeng-theme-init.service';
import { AuthService } from '@/lib/services/auth.service';

import type { SideEnum } from '@/types';

/**
 * Props dla LiveMatchPageComponent (dla Astro)
 */
export interface LiveMatchPageComponentProps {
  matchId: number;
}

/**
 * LiveMatchPageComponent
 *
 * Główny komponent standalone Angular zarządzający całym widokiem meczu na żywo.
 * Odpowiada za inicjalizację danych, koordynację akcji użytkownika,
 * zarządzanie stanem i komunikację z API.
 * Zawiera AppLayoutComponent jako współdzielony element nawigacji.
 */
@Component({
  selector: 'app-live-match-page',
  standalone: true,
  imports: [
    CommonModule,
    AppLayoutComponent,
    ToastModule,
    BlockUIModule,
    ProgressSpinnerModule,
    ScoreDisplayCardComponent,
    TagSelectionPanelComponent,
    PointScoringButtonsComponent,
    MatchControlActionsComponent,
    SetsHistoryTableComponent,
    FinishSetDialogComponent,
    FinishMatchDialogComponent,
  ],
  templateUrl: './live-match-page.component.html',
  styleUrl: './live-match-page.component.css',
})
export class LiveMatchPageComponent implements OnInit, OnDestroy {
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
  readonly store = inject(LiveMatchStoreService);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  // Input z Astro
  readonly matchId = input.required<number>();

  // Dane użytkownika z AuthService
  readonly userName = computed(() => {
    const user = this.authService.user();
    return user?.full_name || user?.email || 'Użytkownik';
  });

  readonly userInitials = computed(() => {
    const user = this.authService.user();
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      return names.length >= 2
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0].substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'UŻ';
  });

  readonly userAvatarUrl = computed(() => {
    const user = this.authService.user();
    return user?.avatar_url || undefined;
  });

  constructor() {
    // Effect do sprawdzania statusu meczu i przekierowania
    effect(() => {
      const status = this.store.matchStatus();
      const matchId = this.store.matchId();

      // Jeśli mecz jest zakończony, przekieruj do summary
      if (status === 'finished' && matchId > 0) {
        if (typeof window !== 'undefined') {
          window.location.href = `/matches/${matchId}/summary`;
        }
      }
    });
  }

  ngOnInit(): void {
    this.initializeMatch();
  }

  ngOnDestroy(): void {
    this.store.reset();
  }

  /**
   * Inicjalizacja - pobranie danych meczu i tagów
   */
  private initializeMatch(): void {
    const id = this.matchId();

    // Równoległe pobranie danych meczu i tagów
    this.store.loadMatch(id);
    this.store.loadTags();

    // Status meczu jest sprawdzany przez effect w konstruktorze
    // TODO: Weryfikacja ownership - jeśli brak dostępu → redirect + toast
  }

  /**
   * Obsługa zmiany selekcji tagów
   */
  onTagSelectionChange(selectedTagIds: number[]): void {
    this.store.setSelectedTags(selectedTagIds);
  }

  /**
   * Obsługa zdobycia punktu
   */
  onPointScored(scoredBy: SideEnum): void {
    this.store.scorePoint(scoredBy);
  }

  /**
   * Obsługa cofnięcia punktu
   */
  onUndoPoint(): void {
    this.store.undoLastPoint();
  }

  /**
   * Obsługa żądania zakończenia seta
   */
  onFinishSetRequested(): void {
    this.store.openFinishSetDialog();
  }

  /**
   * Obsługa anulowania dialogu zakończenia seta
   */
  onFinishSetCancel(): void {
    this.store.closeFinishSetDialog();
  }

  /**
   * Obsługa potwierdzenia zakończenia seta
   */
  onFinishSetConfirm(coachNotes: string | null): void {
    this.store.finishSet(coachNotes);
  }

  /**
   * Obsługa żądania zakończenia meczu
   */
  onFinishMatchRequested(): void {
    this.store.openFinishMatchDialog();
  }

  /**
   * Obsługa anulowania dialogu zakończenia meczu
   */
  onFinishMatchCancel(): void {
    this.store.closeFinishMatchDialog();
  }

  /**
   * Obsługa potwierdzenia zakończenia meczu
   */
  onFinishMatchConfirm(coachNotes: string | null): void {
    this.store.finishMatch(coachNotes, (matchId: number) => {
      // Toast sukcesu
      if (this.store.generateAiSummary()) {
        this.messageService.add({
          severity: 'success',
          summary: 'Mecz zakończony',
          detail: 'Generowanie raportu AI...',
          life: 3000,
        });
      } else {
        this.messageService.add({
          severity: 'success',
          summary: 'Mecz zakończony',
          life: 3000,
        });
      }

      // Redirect do /summary
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = `/matches/${matchId}/summary`;
        }, 1500);
      }
    });
  }

  /**
   * Pomocnicza metoda do obliczania aktualnego wyniku dla dialogu finish set
   */
  getCurrentScore(): { player: number; opponent: number } {
    const current = this.store.currentSet();
    return {
      player: current?.set_score_player ?? 0,
      opponent: current?.set_score_opponent ?? 0,
    };
  }

  /**
   * Pomocnicza metoda do obliczania numeru bieżącego seta
   */
  getCurrentSetNumber(): number {
    return this.store.currentSet()?.sequence_in_match ?? 1;
  }

}

