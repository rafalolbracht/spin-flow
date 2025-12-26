import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

/**
 * NotFoundStateComponent
 *
 * Komponent wyświetlany gdy token jest nieprawidłowy lub mecz nie istnieje.
 * Oparty na wzorcu PrimeBlocks "Empty State" - centrowany na ekranie,
 * z ikoną, nagłówkiem i tekstem pomocniczym.
 */
@Component({
  selector: 'app-not-found-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './not-found-state.component.html',
})
export class NotFoundStateComponent {
  readonly showHomeLink = input<boolean>(false);
}

