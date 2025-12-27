import { Injectable, inject, signal, computed } from '@angular/core';
import type {
  MatchDetailDto,
  TagDto,
  CurrentSetDto,
  SetDetailDto,
  SideEnum,
  CreatePointCommandDto,
  FinishSetCommandDto,
  FinishMatchCommandDto,
} from '@/types';
import { LiveMatchApiService } from './live-match-api.service';

/**
 * LiveMatchStoreService
 *
 * Serwis zarządzania stanem dla widoku Live Match.
 * Wykorzystuje Angular Signals dla reaktywności.
 * Koordynuje akcje użytkownika z API i aktualizuje stan.
 */
@Injectable({
  providedIn: 'root',
})
export class LiveMatchStoreService {
  private readonly apiService = inject(LiveMatchApiService);

  // =============================================================================
  // WRITEABLE SIGNALS (Stan główny)
  // =============================================================================

  private readonly _matchData = signal<MatchDetailDto | null>(null);
  private readonly _tags = signal<TagDto[]>([]);
  private readonly _selectedTagIds = signal<number[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _isFinishSetDialogVisible = signal<boolean>(false);
  private readonly _isFinishMatchDialogVisible = signal<boolean>(false);

  // =============================================================================
  // COMPUTED SIGNALS (Readonly, obliczane)
  // =============================================================================

  readonly matchData = this._matchData.asReadonly();
  readonly tags = this._tags.asReadonly();
  readonly selectedTagIds = this._selectedTagIds.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isFinishSetDialogVisible = this._isFinishSetDialogVisible.asReadonly();
  readonly isFinishMatchDialogVisible = this._isFinishMatchDialogVisible.asReadonly();

  // Computed: dane meczu
  readonly matchId = computed(() => this._matchData()?.id ?? 0);
  readonly matchStatus = computed(() => this._matchData()?.status ?? 'in_progress');
  readonly playerName = computed(() => this._matchData()?.player_name ?? '');
  readonly opponentName = computed(() => this._matchData()?.opponent_name ?? '');
  readonly maxSets = computed(() => this._matchData()?.max_sets ?? 0);
  readonly goldenSetEnabled = computed(() => this._matchData()?.golden_set_enabled ?? false);
  readonly generateAiSummary = computed(() => this._matchData()?.generate_ai_summary ?? false);
  readonly setsWonPlayer = computed(() => this._matchData()?.sets_won_player ?? 0);
  readonly setsWonOpponent = computed(() => this._matchData()?.sets_won_opponent ?? 0);
  readonly currentSet = computed(() => this._matchData()?.current_set ?? null);
  readonly sets = computed(() => this._matchData()?.sets ?? []);

  // Computed: flagi akcji - pobierane z backendu
  readonly canUndoPoint = computed(() => {
    const current = this.currentSet();
    if (!current || this._isLoading()) return false;
    return current.can_undo_point;
  });

  readonly canFinishSet = computed(() => {
    const current = this.currentSet();
    if (!current || this._isLoading()) return false;
    return current.can_finish_set;
  });

  readonly canFinishMatch = computed(() => {
    const current = this.currentSet();
    if (!current || this._isLoading()) return false;
    return current.can_finish_match;
  });

  /**
   * Przewidywany wynik setowy gracza po zakończeniu bieżącego seta
   * (używane w dialogu zakończenia meczu)
   */
  readonly predictedSetsWonPlayer = computed(() => {
    const current = this.currentSet();
    if (!current || current.is_finished) {
      return this.setsWonPlayer();
    }

    // Jeśli bieżący set nie jest remisowy, oblicz przewidywany wynik
    if (current.set_score_player > current.set_score_opponent) {
      return this.setsWonPlayer() + 1;
    }

    return this.setsWonPlayer();
  });

  /**
   * Przewidywany wynik setowy przeciwnika po zakończeniu bieżącego seta
   * (używane w dialogu zakończenia meczu)
   */
  readonly predictedSetsWonOpponent = computed(() => {
    const current = this.currentSet();
    if (!current || current.is_finished) {
      return this.setsWonOpponent();
    }

    // Jeśli bieżący set nie jest remisowy, oblicz przewidywany wynik
    if (current.set_score_opponent > current.set_score_player) {
      return this.setsWonOpponent() + 1;
    }

    return this.setsWonOpponent();
  });

  // =============================================================================
  // METODY AKCJI
  // =============================================================================

  /**
   * Ładuje dane meczu z API
   */
  loadMatch(matchId: number): void {
    this._isLoading.set(true);
    this._error.set(null);

    this.apiService.getMatch(matchId).subscribe({
      next: (data) => {
        this._matchData.set(data);
        this._isLoading.set(false);
      },
      error: (err) => {
        this._error.set(err?.message ?? 'Błąd ładowania meczu');
        this._isLoading.set(false);
      },
    });
  }

  /**
   * Ładuje listę tagów z API
   */
  loadTags(): void {
    this.apiService.getTags().subscribe({
      next: (data) => {
        this._tags.set(data);
      },
      error: () => {
        // Błąd ładowania tagów - cicha obsługa
      },
    });
  }

  /**
   * Toggle tagu w selekcji
   */
  toggleTag(tagId: number): void {
    const current = this._selectedTagIds();
    const index = current.indexOf(tagId);

    if (index === -1) {
      // Dodaj tag
      this._selectedTagIds.set([...current, tagId]);
    } else {
      // Usuń tag
      this._selectedTagIds.set(current.filter(id => id !== tagId));
    }
  }

  /**
   * Ustawia pełną listę zaznaczonych tagów (dla synchronizacji z SelectButton)
   */
  setSelectedTags(tagIds: number[]): void {
    this._selectedTagIds.set(tagIds);
  }

  /**
   * Czyści zaznaczone tagi
   */
  clearSelectedTags(): void {
    this._selectedTagIds.set([]);
  }

  /**
   * Rejestruje punkt
   */
  scorePoint(scoredBy: SideEnum): void {
    const current = this.currentSet();
    if (!current) return;

    this._isLoading.set(true);
    this._error.set(null);

    const command: CreatePointCommandDto = {
      scored_by: scoredBy,
      tag_ids: this._selectedTagIds().length > 0 ? this._selectedTagIds() : undefined,
    };

    this.apiService.createPoint(current.id, command).subscribe({
      next: (result) => {
        // Aktualizuj current_set z set_state
        const matchData = this._matchData();
        if (matchData && matchData.current_set) {
          // Aktualizuj current_set (nowy obiekt) z flagami z backendu
          const updatedCurrentSet: CurrentSetDto = {
            ...matchData.current_set,
            set_score_player: result.set_state.set_score_player,
            set_score_opponent: result.set_state.set_score_opponent,
            current_server: result.set_state.current_server,
            can_undo_point: result.set_state.can_undo_point,
            can_finish_set: result.set_state.can_finish_set,
            can_finish_match: result.set_state.can_finish_match,
          };

          // Aktualizuj tablicę sets - zastąp bieżący set nowym obiektem z aktualnymi danymi
          const updatedSets = matchData.sets?.map(s =>
            s.id === current.id
              ? {
                  ...s,
                  set_score_player: result.set_state.set_score_player,
                  set_score_opponent: result.set_state.set_score_opponent,
                  current_server: result.set_state.current_server,
                }
              : s,
          ) ?? [];

          // Ustaw nowy obiekt matchData z nowymi referencjami
          this._matchData.set({
            ...matchData,
            current_set: updatedCurrentSet,
            sets: updatedSets,
          });
        }

        // Wyczyść zaznaczone tagi
        this.clearSelectedTags();
        this._isLoading.set(false);
      },
      error: (err) => {
        this._error.set(err?.message ?? 'Błąd rejestracji punktu');
        this._isLoading.set(false);
      },
    });
  }

  /**
   * Cofa ostatni punkt
   */
  undoLastPoint(): void {
    const current = this.currentSet();
    if (!current) return;

    this._isLoading.set(true);
    this._error.set(null);

    this.apiService.undoPoint(current.id).subscribe({
      next: (result) => {
        // Aktualizuj current_set z set_state
        const matchData = this._matchData();
        if (matchData && matchData.current_set) {
          // Aktualizuj current_set (nowy obiekt) z flagami z backendu
          const updatedCurrentSet: CurrentSetDto = {
            ...matchData.current_set,
            set_score_player: result.set_state.set_score_player,
            set_score_opponent: result.set_state.set_score_opponent,
            current_server: result.set_state.current_server,
            can_undo_point: result.set_state.can_undo_point,
            can_finish_set: result.set_state.can_finish_set,
            can_finish_match: result.set_state.can_finish_match,
          };

          // Aktualizuj tablicę sets - zastąp bieżący set nowym obiektem z aktualnymi danymi
          const updatedSets = matchData.sets?.map(s =>
            s.id === current.id
              ? {
                  ...s,
                  set_score_player: result.set_state.set_score_player,
                  set_score_opponent: result.set_state.set_score_opponent,
                  current_server: result.set_state.current_server,
                }
              : s,
          ) ?? [];

          // Ustaw nowy obiekt matchData z nowymi referencjami
          this._matchData.set({
            ...matchData,
            current_set: updatedCurrentSet,
            sets: updatedSets,
          });
        }

        this._isLoading.set(false);
      },
      error: (err) => {
        this._error.set(err?.message ?? 'Błąd cofania punktu');
        this._isLoading.set(false);
      },
    });
  }

  /**
   * Otwiera dialog zakończenia seta
   */
  openFinishSetDialog(): void {
    this._isFinishSetDialogVisible.set(true);
  }

  /**
   * Zamyka dialog zakończenia seta
   */
  closeFinishSetDialog(): void {
    this._isFinishSetDialogVisible.set(false);
  }

  /**
   * Kończy set z uwagami trenera
   */
  finishSet(coachNotes: string | null): void {
    const current = this.currentSet();
    if (!current) return;

    this._isLoading.set(true);
    this._error.set(null);

    const command: FinishSetCommandDto = {
      coach_notes: coachNotes,
    };

    this.apiService.finishSet(current.id, command).subscribe({
      next: (result) => {
        const matchData = this._matchData();
        if (matchData) {
          // Inicjalizuj tablicę sets jeśli nie istnieje
          if (!matchData.sets) {
            matchData.sets = [];
          }

          const finishedSetDetail: SetDetailDto = {
            id: result.finished_set.id,
            match_id: matchData.id,
            sequence_in_match: current.sequence_in_match,
            is_golden: current.is_golden,
            set_score_player: result.finished_set.set_score_player,
            set_score_opponent: result.finished_set.set_score_opponent,
            winner: result.finished_set.winner,
            is_finished: true,
            coach_notes: coachNotes,
            created_at: new Date().toISOString(),
            finished_at: result.finished_set.finished_at,
          };

          // Usuń lub zaktualizuj istniejący set o tym samym ID (jeśli był w tablicy jako niezakończony)
          // i dodaj zakończony set
          const updatedSets = matchData.sets
            .filter(s => s.id !== current.id)
            .concat(finishedSetDetail);

          matchData.sets = updatedSets;

          // Zaktualizuj wynik setowy
          if (result.finished_set.winner === 'player') {
            matchData.sets_won_player++;
          } else {
            matchData.sets_won_opponent++;
          }

          // Ustaw nowy current_set
          matchData.current_set = result.next_set;

          this._matchData.set({ ...matchData });
        }

        this.closeFinishSetDialog();
        this._isLoading.set(false);
      },
      error: (err) => {
        this._error.set(err?.message ?? 'Błąd zakończenia seta');
        this._isLoading.set(false);
      },
    });
  }

  /**
   * Otwiera dialog zakończenia meczu
   */
  openFinishMatchDialog(): void {
    this._isFinishMatchDialogVisible.set(true);
  }

  /**
   * Zamyka dialog zakończenia meczu
   */
  closeFinishMatchDialog(): void {
    this._isFinishMatchDialogVisible.set(false);
  }

  /**
   * Kończy mecz z uwagami trenera
   * Po sukcesie wywołuje callback dla nawigacji (z komponentu głównego)
   *
   * Backend automatycznie zamyka bieżący set przed zakończeniem meczu.
   */
  finishMatch(coachNotes: string | null, onSuccess: (matchId: number) => void): void {
    const matchId = this.matchId();
    if (!matchId) return;

    this._isLoading.set(true);
    this._error.set(null);

    const command: FinishMatchCommandDto = {
      coach_notes: coachNotes,
    };

    this.apiService.finishMatch(matchId, command).subscribe({
      next: () => {
        this.closeFinishMatchDialog();
        this._isLoading.set(false);
        onSuccess(matchId);
      },
      error: (err) => {
        this._error.set(err?.message ?? 'Błąd zakończenia meczu');
        this._isLoading.set(false);
      },
    });
  }

  /**
   * Resetuje cały stan (cleanup)
   */
  reset(): void {
    this._matchData.set(null);
    this._tags.set([]);
    this._selectedTagIds.set([]);
    this._isLoading.set(false);
    this._error.set(null);
    this._isFinishSetDialogVisible.set(false);
    this._isFinishMatchDialogVisible.set(false);
  }
}

