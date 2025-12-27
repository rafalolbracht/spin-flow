import { Injectable, signal, computed, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { MatchSummaryApiService } from './match-summary-api.service';
import type {
  MatchDetailDto,
  SetDetailDto,
  AiReportDto,
  PublicShareDto,
} from '@/types';

/**
 * Stan raportu AI
 */
export type AiReportState = 'hidden' | 'pending' | 'success' | 'error';

/**
 * MatchSummaryStateService
 *
 * Serwis zarządzający stanem widoku Match Summary przy użyciu Angular Signals.
 * Dostarcza metody do aktualizacji stanu oraz kontroli dialogów modalnych.
 */
@Injectable({
  providedIn: 'root',
})
export class MatchSummaryStateService {
  private readonly api = inject(MatchSummaryApiService);
  private readonly messageService = inject(MessageService);

  // =============================================================================
  // PRYWATNE WRITEABLE SIGNALS
  // =============================================================================

  // Dane meczu
  private readonly _matchId = signal<number>(0);
  private readonly _playerName = signal<string>('');
  private readonly _opponentName = signal<string>('');
  private readonly _startedAt = signal<string>('');
  private readonly _endedAt = signal<string | null>(null);
  private readonly _setsWonPlayer = signal<number>(0);
  private readonly _setsWonOpponent = signal<number>(0);
  private readonly _sets = signal<SetDetailDto[]>([]);
  private readonly _matchNotes = signal<string | null>(null);
  private readonly _aiReport = signal<AiReportDto | null>(null);
  private readonly _generateAiSummary = signal<boolean>(false);

  // Stan linku publicznego
  private readonly _publicShare = signal<PublicShareDto | null>(null);

  // Stany UI
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isRefreshingAi = signal<boolean>(false);
  private readonly _isGeneratingShare = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Stany dialogów
  private readonly _isShareDialogVisible = signal<boolean>(false);

  // =============================================================================
  // PUBLICZNE READONLY SIGNALS
  // =============================================================================

  // Dane meczu
  readonly matchId = this._matchId.asReadonly();
  readonly playerName = this._playerName.asReadonly();
  readonly opponentName = this._opponentName.asReadonly();
  readonly startedAt = this._startedAt.asReadonly();
  readonly endedAt = this._endedAt.asReadonly();
  readonly setsWonPlayer = this._setsWonPlayer.asReadonly();
  readonly setsWonOpponent = this._setsWonOpponent.asReadonly();
  readonly sets = this._sets.asReadonly();
  readonly matchNotes = this._matchNotes.asReadonly();
  readonly aiReport = this._aiReport.asReadonly();
  readonly generateAiSummary = this._generateAiSummary.asReadonly();

  // Stan linku publicznego
  readonly publicShare = this._publicShare.asReadonly();

  // Stany UI
  readonly isLoading = this._isLoading.asReadonly();
  readonly isRefreshingAi = this._isRefreshingAi.asReadonly();
  readonly isGeneratingShare = this._isGeneratingShare.asReadonly();
  readonly error = this._error.asReadonly();

  // Stany dialogów
  readonly isShareDialogVisible = this._isShareDialogVisible.asReadonly();

  // =============================================================================
  // COMPUTED SIGNALS
  // =============================================================================

  /**
   * Stan raportu AI
   */
  readonly aiReportState = computed<AiReportState>(() => {
    if (!this._generateAiSummary()) {
      return 'hidden';
    }

    const report = this._aiReport();
    if (!report) {
      return 'pending';
    }

    return report.ai_status as AiReportState;
  });

  /**
   * URL publicznego linku
   */
  readonly publicUrl = computed<string | null>(() => {
    const share = this._publicShare();
    return share ? share.public_url : null;
  });

  // =============================================================================
  // METODY ŁADOWANIA DANYCH
  // =============================================================================

  /**
   * Ładuje dane meczu z API
   */
  async loadMatch(matchId: number): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(this.api.getMatchDetail(matchId));
      const match = response.data;

      // Sprawdzenie statusu meczu - jeśli in_progress, przekieruj do /live
      if (match.status === 'in_progress') {
        if (typeof window !== 'undefined') {
          window.location.href = `/matches/${matchId}/live`;
        }
        return;
      }

      // Ustawienie danych meczu
      this.setMatchData(match);
    } catch (error: unknown) {
      this._error.set('Nie udało się załadować meczu');

      // Obsługa specyficznych błędów
      const httpError = error as { status?: number };
      if (httpError.status === 404) {
        this.messageService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: 'Mecz nie istnieje',
          life: 3000,
        });

        // Redirect do /matches
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/matches';
          }
        }, 1500);
      } else if (httpError.status === 403) {
        this.messageService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: 'Brak dostępu do tego meczu',
          life: 3000,
        });

        // Redirect do /matches
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/matches';
          }
        }, 1500);
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Ustawia dane meczu po pobraniu
   */
  setMatchData(match: MatchDetailDto): void {
    this._matchId.set(match.id);
    this._playerName.set(match.player_name);
    this._opponentName.set(match.opponent_name);
    this._startedAt.set(match.started_at);
    this._endedAt.set(match.ended_at);
    this._setsWonPlayer.set(match.sets_won_player);
    this._setsWonOpponent.set(match.sets_won_opponent);
    this._sets.set(match.sets ?? []);
    this._matchNotes.set(match.coach_notes);
    this._aiReport.set(match.ai_report ?? null);
    this._generateAiSummary.set(match.generate_ai_summary);
  }

  // =============================================================================
  // METODY AKTUALIZACJI DANYCH
  // =============================================================================

  /**
   * Odświeża raport AI
   */
  async refreshAiReport(): Promise<void> {
    const matchId = this._matchId();
    if (!matchId) return;

    // Zapobiegaj wielokrotnym równoległym wywołaniom
    if (this._isRefreshingAi()) {
      this.messageService.add({
        severity: 'info',
        summary: 'Odświeżanie w toku',
        detail: 'Poczekaj na zakończenie aktualnego odświeżania',
        life: 2000,
      });
      return;
    }

    this._isRefreshingAi.set(true);

    try {
      const response = await firstValueFrom(this.api.refreshAiReport(matchId));
      this._aiReport.set(response.data);

      this.messageService.add({
        severity: 'success',
        summary: 'Odświeżono',
        detail: 'Raport AI został zaktualizowany',
        life: 3000,
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się odświeżyć raportu AI',
        life: 3000,
      });
    } finally {
      this._isRefreshingAi.set(false);
    }
  }

  /**
   * Generuje publiczny link do meczu
   */
  async generatePublicShare(): Promise<void> {
    const matchId = this._matchId();
    if (!matchId) return;

    // Jeśli link już istnieje, po prostu otwórz dialog
    if (this._publicShare()) {
      this.openShareDialog();
      return;
    }

    this._isGeneratingShare.set(true);

    try {
      const response = await firstValueFrom(this.api.createPublicShare(matchId));
      this._publicShare.set(response.data);

      this.openShareDialog();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się wygenerować linku',
        life: 3000,
      });
    } finally {
      this._isGeneratingShare.set(false);
    }
  }

  // =============================================================================
  // METODY KONTROLI DIALOGÓW
  // =============================================================================

  openShareDialog(): void {
    this._isShareDialogVisible.set(true);
  }

  closeShareDialog(): void {
    this._isShareDialogVisible.set(false);
  }

  // =============================================================================
  // RESET
  // =============================================================================

  /**
   * Czyści cały stan (wywoływane przy opuszczeniu widoku)
   */
  reset(): void {
    this._matchId.set(0);
    this._playerName.set('');
    this._opponentName.set('');
    this._startedAt.set('');
    this._endedAt.set(null);
    this._setsWonPlayer.set(0);
    this._setsWonOpponent.set(0);
    this._sets.set([]);
    this._matchNotes.set(null);
    this._aiReport.set(null);
    this._generateAiSummary.set(false);
    this._publicShare.set(null);
    this._isLoading.set(false);
    this._isRefreshingAi.set(false);
    this._isGeneratingShare.set(false);
    this._error.set(null);
    this._isShareDialogVisible.set(false);
  }
}

