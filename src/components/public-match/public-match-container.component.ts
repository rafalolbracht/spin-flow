import {
  Component,
  input,
  signal,
  computed,
  inject,
  type OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { httpProviders } from '@/lib/config/http-providers';
import type { PublicMatchDto } from '@/types';
import { PublicMatchApiService } from './services/public-match-api.service';
import { MatchSkeletonComponent } from './match-skeleton/match-skeleton.component';
import { ErrorPageComponent } from '@/components/error-page/error-page.component';
import { MatchHeaderSectionComponent } from '../shared/match-header-section.component';
import { SetsHistoryTableComponent } from '../shared/sets-history-table.component';
import { CoachNotesAccordionComponent } from '../match-summary/coach-notes-accordion.component';
import { AiReportSectionComponent } from '../match-summary/ai-report-section.component';
import { BrandingFooterComponent } from './branding-footer/branding-footer.component';
import { ThemeService } from '@/lib/services/theme.service';
import { PrimeNGThemeInitService } from '@/lib/config/primeng-theme-init.service';

/**
 * Props dla PublicMatchContainerComponent (dla Astro)
 */
export interface PublicMatchContainerComponentProps {
  token: string;
}

/**
 * Typ stanu widoku
 */
type ViewState = 'loading' | 'success' | 'error';

/**
 * PublicMatchContainerComponent
 *
 * Główny komponent kontenera Angular zarządzający widokiem publicznego meczu.
 * Odpowiada za:
 * - Pobranie tokenu z inputa (przekazanego z Astro)
 * - Walidację formatu tokenu (43 znaki base64url)
 * - Wywołanie API i zarządzanie stanem (loading/success/error)
 * - Renderowanie odpowiednich komponentów w zależności od stanu
 *
 * Widok publiczny jest read-only, bez możliwości edycji i bez wymagania logowania.
 */
@Component({
  selector: 'app-public-match-container',
  standalone: true,
  imports: [
    CommonModule,
    MatchSkeletonComponent,
    ErrorPageComponent,
    MatchHeaderSectionComponent,
    SetsHistoryTableComponent,
    CoachNotesAccordionComponent,
    AiReportSectionComponent,
    BrandingFooterComponent,
  ],
  templateUrl: './public-match-container.component.html',
  styleUrl: './public-match-container.component.css',
})
export class PublicMatchContainerComponent implements OnInit {
  /**
   * Providery dla klienta Astro (analogjs pattern)
   * W architekturze Astro+Angular musimy dostarczyć serwisy na poziomie root komponentu
   */
  static clientProviders = [
    provideAnimations(),
    httpProviders,
    MessageService, // Required by HttpErrorInterceptor
  ];

  // Services
  readonly themeService = inject(ThemeService);
  private readonly _themeInit = inject(PrimeNGThemeInitService);
  private readonly apiService = inject(PublicMatchApiService);

  // Input z Astro
  readonly token = input.required<string>();

  // Stan widoku
  private readonly _state = signal<ViewState>('loading');
  private readonly _matchData = signal<PublicMatchDto | null>(null);
  private readonly _errorMessage = signal<string | null>(null);

  // Publiczne readonly sygnały
  readonly state = this._state.asReadonly();
  readonly matchData = this._matchData.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  // Computed properties
  readonly match = computed(() => this.matchData()?.match ?? null);
  readonly sets = computed(() => this.matchData()?.sets ?? null);
  readonly aiReport = computed(() => this.matchData()?.ai_report ?? null);

  readonly playerName = computed(() => this.match()?.player_name ?? null);
  readonly opponentName = computed(() => this.match()?.opponent_name ?? null);
  readonly startedAt = computed(() => this.match()?.started_at ?? null);
  readonly setsWonPlayer = computed(() => this.match()?.sets_won_player ?? 0);
  readonly setsWonOpponent = computed(() => this.match()?.sets_won_opponent ?? 0);
  readonly matchNotes = computed(() => this.match()?.coach_notes ?? null);

  /**
   * Logo path based on theme
   */
  readonly logoPath = computed(() =>
    this.themeService.isDarkMode() ? '/logo-dark.svg' : '/logo.svg',
  );

  /**
   * Dark mode icon class
   */
  readonly darkModeIconClass = computed(() =>
    this.themeService.isDarkMode() ? 'pi pi-sun text-base text-surface-600' : 'pi pi-moon text-base text-surface-600',
  );

  /**
   * Sprawdza czy są jakiekolwiek uwagi (do meczu lub setów)
   */
  readonly hasCoachNotes = computed(() => {
    const notes = this.matchNotes();
    const setsData = this.sets();

    if (notes && notes.trim() !== '') {
      return true;
    }

    if (setsData) {
      return setsData.some(
        (set) => set.coach_notes && set.coach_notes.trim() !== '',
      );
    }

    return false;
  });

  ngOnInit(): void {
    this.loadMatch();
  }

  /**
   * Przełącza dark mode
   */
  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  /**
   * Regex dla walidacji tokenu: 43 znaki base64url [A-Za-z0-9_-]
   */
  private readonly TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

  /**
   * Waliduje format tokenu i ładuje dane meczu
   */
  private loadMatch(): void {
    const tokenValue = this.token();

    // Walidacja formatu tokenu
    if (!this.TOKEN_REGEX.test(tokenValue)) {
      this.setError('Nieprawidłowy format tokenu');
      return;
    }

    // Pobranie danych z API
    this._state.set('loading');

    this.apiService
      .getPublicMatch(tokenValue)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.setError('Mecz nie istnieje');
          } else if (error.status === 0) {
            this.setError('Brak połączenia z internetem');
          } else if (error.status >= 500) {
            this.setError('Wystąpił błąd serwera');
          } else {
            this.setError('Wystąpił nieoczekiwany błąd');
          }
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response && response.data) {
          this.setSuccess(response.data);
        }
      });
  }

  /**
   * Ustawia stan sukcesu z danymi
   */
  private setSuccess(data: PublicMatchDto): void {
    this._matchData.set(data);
    this._state.set('success');
    this._errorMessage.set(null);
  }

  /**
   * Ustawia stan błędu z komunikatem
   */
  private setError(message: string): void {
    this._state.set('error');
    this._errorMessage.set(message);
    this._matchData.set(null);
  }
}

