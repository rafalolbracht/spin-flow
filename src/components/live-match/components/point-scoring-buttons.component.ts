import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { SideEnum } from '@/types';

/**
 * PointScoringButtons
 *
 * Duże okrągłe przyciski do dodawania punktów.
 * Wyświetlane PONIŻEJ tagów.
 */
@Component({
  selector: 'app-point-scoring-buttons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './point-scoring-buttons.component.html',
  styleUrl: './point-scoring-buttons.component.css',
})
export class PointScoringButtonsComponent {
  // Props
  readonly disabled = input<boolean>(false);

  // Events
  readonly pointScored = output<SideEnum>();

  onPlayerScored(): void {
    if (!this.disabled()) {
      this.pointScored.emit('player');
    }
  }

  onOpponentScored(): void {
    if (!this.disabled()) {
      this.pointScored.emit('opponent');
    }
  }
}

