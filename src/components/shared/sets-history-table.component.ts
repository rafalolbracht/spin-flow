import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

// Types
import type { SetDetailDto } from '../../types';

/**
 * Komponent tabeli historii setów
 *
 * Reużywalna tabela wyświetlająca listę setów z wynikami punktowymi.
 * Używana w widokach meczu "W toku" (z wyróżnieniem bieżącego seta)
 * oraz meczu "Zakończony" (bez wyróżnienia).
 */
@Component({
  selector: 'app-sets-history-table',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    TagModule,
  ],
  template: `
    <p-table
      [value]="sets()"
      [scrollable]="true"
      scrollHeight="400px"
      size="small"
      [stripedRows]="true"
      styleClass="sets-history-table"
      responsiveLayout="scroll"
    >
      <!-- Nr seta -->
      <ng-template pTemplate="header">
        <tr>
          <th class="w-16 text-center">#</th>
          <th class="text-center">{{ playerName() }}</th>
          <th class="text-center">{{ opponentName() }}</th>
          <th class="w-24 text-center">Zwycięzca</th>
        </tr>
      </ng-template>

      <!-- Wiersze tabeli -->
      <ng-template pTemplate="body" let-set let-rowIndex="rowIndex">
        <tr
          [class.bg-primary-50]="isCurrentSet(set.id)"
          [class.border-primary-200]="isCurrentSet(set.id)"
          class="transition-colors duration-200"
        >
          <!-- Numer seta -->
          <td class="text-center font-medium text-surface-900">
            <span [class.text-primary]="isCurrentSet(set.id)">
              {{ set.sequence_in_match }}
            </span>
            @if (set.is_golden) {
              <span class="text-xs text-amber-600 ml-1" title="Golden set">★</span>
            }
          </td>

          <!-- Wynik zawodnika -->
          <td class="text-center">
            <span
              class="text-lg font-bold"
              [class.text-primary]="isCurrentSet(set.id)"
              [class.text-surface-900]="!isCurrentSet(set.id)"
            >
              {{ set.set_score_player }}
            </span>
          </td>

          <!-- Wynik rywala -->
          <td class="text-center">
            <span
              class="text-lg font-bold"
              [class.text-primary]="isCurrentSet(set.id)"
              [class.text-surface-900]="!isCurrentSet(set.id)"
            >
              {{ set.set_score_opponent }}
            </span>
          </td>

          <!-- Zwycięzca / Status -->
          <td class="text-center">
            @if (set.is_finished && set.winner) {
              <p-tag
                [value]="getWinnerLabel(set.winner)"
                [severity]="getWinnerSeverity(set.winner)"
                size="small"
              ></p-tag>
            } @else if (!set.is_finished) {
              <p-tag
                value="W toku"
                severity="info"
                size="small"
              ></p-tag>
            } @else {
              <p-tag
                value="Nierozstrzygnięty"
                severity="secondary"
                size="small"
              ></p-tag>
            }
          </td>
        </tr>
      </ng-template>

      <!-- Pusty stan -->
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="4" class="text-center py-8 text-surface-500">
            <div class="flex flex-col items-center space-y-2">
              <i class="pi pi-chart-line text-2xl text-surface-400"></i>
              <span>Brak danych setów</span>
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
  styles: [`
    :host ::ng-deep .sets-history-table {
      /* Dostosowanie stylów PrimeNG do design tokens */
      --surface-border: var(--surface-200);
      --primary-color: var(--primary-500);
      --primary-contrast-color: var(--primary-contrast-color);
    }

    :host ::ng-deep .sets-history-table .p-datatable-tbody > tr:hover {
      background-color: var(--surface-50);
    }

    :host ::ng-deep .sets-history-table .p-datatable-tbody > tr.bg-primary-50 {
      background-color: var(--primary-50);
    }

    :host ::ng-deep .sets-history-table .p-datatable-tbody > tr.bg-primary-50:hover {
      background-color: var(--primary-100);
    }

    /* Responsywność dla małych ekranów */
    @media (max-width: 640px) {
      :host ::ng-deep .sets-history-table .p-datatable-tbody > tr > td {
        padding: 0.5rem 0.25rem;
      }

      :host ::ng-deep .sets-history-table .p-datatable-tbody > tr > td > span {
        font-size: 0.9rem;
      }
    }

    /* Efekt golden set */
    .golden-set-star {
      color: var(--amber-600);
      font-size: 0.75rem;
      vertical-align: super;
    }
  `],
})
export class SetsHistoryTableComponent {
  // Input props
  readonly sets = input.required<SetDetailDto[]>();
  readonly currentSetId = input<number | null>(null);
  readonly playerName = input.required<string>();
  readonly opponentName = input.required<string>();

  // Computed properties
  readonly isCurrentSet = computed(() => {
    return (setId: number) => this.currentSetId() === setId;
  });

  /**
   * Zwraca etykietę zwycięzcy na podstawie enum wartości
   */
  getWinnerLabel(winner: 'player' | 'opponent'): string {
    switch (winner) {
      case 'player':
        return 'Zawodnik';
      case 'opponent':
        return 'Rywal';
      default:
        return 'Nieznany';
    }
  }

  /**
   * Zwraca severity dla tagu zwycięzcy (PrimeNG)
   */
  getWinnerSeverity(winner: 'player' | 'opponent'): 'success' | 'warn' {
    switch (winner) {
      case 'player':
        return 'success';
      case 'opponent':
        return 'warn';
      default:
        return 'warn';
    }
  }
}
