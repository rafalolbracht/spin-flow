import {
  Component,
  signal,
  computed,
  inject, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { RippleModule } from 'primeng/ripple';
import { ConfirmationService, MessageService } from 'primeng/api';

// Shared Components
import { AppLayoutComponent } from '@/components/shared/app-layout/app-layout.component';

// Types
import type {
  MatchListItemDto,
  MatchListResponse,
  MatchStatusEnum,
} from '@/types';
import type {
  MatchListFilters,
  MatchListPagination,
} from '../match-list.types';
import {
  DEFAULT_MATCH_LIST_FILTERS,
  DEFAULT_MATCH_LIST_PAGINATION,
  ROWS_PER_PAGE_OPTIONS,
} from '../match-list.types';

/**
 * Komponent strony listy meczów
 *
 * Główny komponent widoku /matches. Zarządza stanem widoku (filtry, paginacja, loading),
 * pobiera dane z API, obsługuje usuwanie meczów i nawigację.
 * Używa AppLayoutComponent jako bazowego layoutu z nawigacją.
 */
@Component({
  selector: 'app-match-list-page',
  standalone: true,
  imports: [
    CommonModule,
    AppLayoutComponent,
    ButtonModule,
    TagModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    PaginatorModule,
    SkeletonModule,
    RippleModule,
  ],
  templateUrl: './match-list-page.component.html',
  styleUrl: './match-list-page.component.css',
})
export class MatchListPageComponent implements OnDestroy {
  /**
   * Providery dla klienta Astro (analogjs pattern)
   * W architekturze Astro+Angular musimy dostarczyć serwisy na poziomie root komponentu
   */
  static clientProviders = [
    ...AppLayoutComponent.clientProviders,
    MessageService,
    ConfirmationService,
  ];

  // Injected Services
  private readonly http = inject(HttpClient);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // Lifecycle
  private readonly destroy$ = new Subject<void>();

  // Filter Subjects (dla debounce)
  private readonly playerNameFilter$ = new Subject<string>();
  private readonly opponentNameFilter$ = new Subject<string>();

  // Dane użytkownika (w przyszłości z AuthService)
  readonly userName = signal<string | undefined>('Jan Kowalski');
  readonly userInitials = signal<string | undefined>('JK');

  // Stan widoku - podstawowe signals
  readonly matches = signal<MatchListItemDto[]>([]);
  readonly filters = signal<MatchListFilters>(DEFAULT_MATCH_LIST_FILTERS);
  readonly pagination = signal<MatchListPagination>(
    DEFAULT_MATCH_LIST_PAGINATION,
  );
  readonly isLoading = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Computed signals
  readonly isEmpty = computed(
    () => !this.isLoading() && this.matches().length === 0,
  );
  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return f.playerName.trim() !== '' || f.opponentName.trim() !== '';
  });
  readonly paginatorFirst = computed(
    () => this.pagination().page * this.pagination().limit,
  );

  // Opcje paginatora
  readonly rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS;

  constructor() {
    this.setupFilterDebounce();
    this.loadMatches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Konfiguracja debounce dla filtrów
   */
  private setupFilterDebounce(): void {
    // Debounce dla filtra zawodnika
    this.playerNameFilter$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => {
        this.filters.update((f) => ({ ...f, playerName: value }));
        this.resetPage();
        this.loadMatches();
      });

    // Debounce dla filtra rywala
    this.opponentNameFilter$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => {
        this.filters.update((f) => ({ ...f, opponentName: value }));
        this.resetPage();
        this.loadMatches();
      });
  }

  /**
   * Pobieranie listy meczów z API
   */
  private loadMatches(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const params = this.buildHttpParams();

    this.http
      .get<MatchListResponse>('/api/matches', { params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.matches.set(response.data);
          this.pagination.update((p) => ({
            ...p,
            total: response.pagination.total,
          }));
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading matches:', err);
          this.error.set('Nie udało się załadować listy meczów');
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Błąd',
            detail: 'Nie udało się załadować listy meczów',
            life: 5000,
          });
        },
      });
  }

  /**
   * Budowanie parametrów HTTP dla zapytania API
   */
  private buildHttpParams(): HttpParams {
    let params = new HttpParams();

    const f = this.filters();
    const p = this.pagination();

    // Konwersja 0-based (PrimeNG) → 1-based (API)
    params = params.set('page', (p.page + 1).toString());
    params = params.set('limit', p.limit.toString());
    params = params.set('sort', '-started_at');

    // Dodanie filtrów (tylko jeśli nie są puste)
    if (f.playerName.trim()) {
      params = params.set('player_name', f.playerName.trim());
    }
    if (f.opponentName.trim()) {
      params = params.set('opponent_name', f.opponentName.trim());
    }

    return params;
  }

  /**
   * Reset strony do 0 (używane przy zmianie filtrów)
   */
  private resetPage(): void {
    this.pagination.update((p) => ({ ...p, page: 0 }));
  }

  /**
   * Obsługa zmiany wartości filtra zawodnika
   */
  onPlayerNameFilterChange(value: string): void {
    this.playerNameFilter$.next(value);
  }

  /**
   * Obsługa zmiany wartości filtra rywala
   */
  onOpponentNameFilterChange(value: string): void {
    this.opponentNameFilter$.next(value);
  }

  /**
   * Wyczyszczenie wszystkich filtrów
   */
  onClearFilters(): void {
    this.filters.set(DEFAULT_MATCH_LIST_FILTERS);
    this.resetPage();
    this.loadMatches();
  }

  /**
   * Obsługa zmiany strony/liczby elementów w paginatorze
   */
  onPageChange(event: PaginatorState): void {
    this.pagination.update((p) => ({
      ...p,
      page: event.page ?? 0,
      limit: event.rows ?? 20,
    }));
    this.loadMatches();
  }

  /**
   * Nawigacja do szczegółów meczu (różna ścieżka w zależności od statusu)
   */
  onMatchClick(match: MatchListItemDto): void {
    const path =
      match.status === 'in_progress'
        ? `/matches/${match.id}/live`
        : `/matches/${match.id}/summary`;

    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  }

  /**
   * Otwarcie dialogu potwierdzenia usunięcia meczu
   */
  onDeleteClick(event: Event, match: MatchListItemDto): void {
    event.stopPropagation();

    this.confirmationService.confirm({
      message: `Czy na pewno chcesz usunąć mecz ${match.player_name} vs ${match.opponent_name}?`,
      header: 'Potwierdzenie usunięcia',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Usuń',
      rejectLabel: 'Anuluj',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteMatch(match.id),
    });
  }

  /**
   * Usunięcie meczu przez API
   */
  private deleteMatch(matchId: number): void {
    this.isDeleting.set(true);

    this.http
      .delete(`/api/matches/${matchId}/delete`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Sukces',
            detail: 'Mecz został usunięty',
            life: 3000,
          });
          this.loadMatches();
        },
        error: (err) => {
          console.error('Error deleting match:', err);
          this.isDeleting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Błąd',
            detail: 'Nie udało się usunąć meczu',
            life: 5000,
          });
        },
      });
  }

  /**
   * Nawigacja do tworzenia nowego meczu
   */
  onNewMatchClick(): void {
    if (typeof window !== 'undefined') {
      window.location.href = '/matches/new';
    }
  }

  /**
   * Pomocnicza metoda do formatowania statusu meczu dla PrimeNG Tag
   */
  getMatchStatusSeverity(
    status: MatchStatusEnum,
  ): 'success' | 'warn' | 'danger' | 'info' {
    return status === 'in_progress' ? 'warn' : 'success';
  }

  /**
   * Pomocnicza metoda do wyświetlania etykiety statusu
   */
  getMatchStatusLabel(status: MatchStatusEnum): string {
    return status === 'in_progress' ? 'W toku' : 'Zakończony';
  }
}
