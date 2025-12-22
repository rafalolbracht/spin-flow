import { Component, signal, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AppLayoutComponent } from '@/components/shared/app-layout/app-layout.component';

/**
 * Komponent strony listy meczów
 *
 * Używa AppLayoutComponent jako bazowego layoutu.
 * Pełna implementacja zgodnie z match-list-view-implementation-plan.md
 * zostanie dodana w kolejnych krokach.
 */
@Component({
  selector: 'app-match-list-page',
  standalone: true,
  imports: [
    AppLayoutComponent,
    ButtonModule,
  ],
  templateUrl: './match-list-page.component.html',
  styleUrl: './match-list-page.component.css',
})
export class MatchListPageComponent {
  /**
   * Providery dla klienta Astro (analogjs pattern)
   * Deleguje do AppLayoutComponent
   */
  static clientProviders = AppLayoutComponent.clientProviders;

  @ViewChild(AppLayoutComponent) appLayout!: AppLayoutComponent;

  // Dane użytkownika (w przyszłości z AuthService)
  readonly userName = signal<string | undefined>('Jan Kowalski');
  readonly userInitials = signal<string | undefined>('JK');

  /**
   * Nawigacja do tworzenia nowego meczu
   */
  onNewMatchClick(): void {
    // Używamy metody z AppLayout do wyświetlenia toast
    this.appLayout?.showInfo('Info', 'Tworzenie meczu - funkcja w przygotowaniu');
    // TODO: window.location.href = '/matches/new';
  }
}
