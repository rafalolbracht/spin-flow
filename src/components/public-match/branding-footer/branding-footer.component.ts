import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * BrandingFooterComponent
 *
 * Stopka z subtelnym brandingiem aplikacji "Powered by Spin Flow".
 * Wzorowana na minimalistycznych footerach z PrimeBlocks.
 * Umieszczona zawsze na dole strony (nie sticky, ale z mt-auto w flex container).
 */
@Component({
  selector: 'app-branding-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="mt-auto py-6 border-t border-surface-200">
      <div class="container mx-auto px-4">
        <div class="text-center">
          <p class="text-sm text-surface-500">
            Powered by
            <a
              [href]="homeUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:text-primary-600 font-semibold transition-colors"
            >
              Spin Flow
            </a>
          </p>
        </div>
      </div>
    </footer>
  `,
  styles: [],
})
export class BrandingFooterComponent {
  readonly homeUrl = input<string>('/');
}

