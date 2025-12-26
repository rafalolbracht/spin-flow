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
  templateUrl: './branding-footer.component.html',
})
export class BrandingFooterComponent {
  readonly homeUrl = input<string>('/');
}

