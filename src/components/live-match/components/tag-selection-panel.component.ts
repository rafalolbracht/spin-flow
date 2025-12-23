import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TagDto } from '@/types';

/**
 * TagSelectionPanel
 *
 * Panel umożliwiający wybór wielu tagów przed zapisem punktu.
 * Wykorzystuje PrimeNG SelectButton w trybie multiple.
 * Tagi są resetowane automatycznie po dodaniu punktu (przez rodzica).
 */
@Component({
  selector: 'app-tag-selection-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tag-selection-panel.component.html',
  styleUrl: './tag-selection-panel.component.css',
})
export class TagSelectionPanelComponent {
  // Props
  readonly tags = input.required<TagDto[]>();
  readonly selectedTagIds = input.required<number[]>();
  readonly disabled = input<boolean>(false);

  // Events
  readonly selectionChange = output<number[]>();

  /**
   * Sprawdza czy tag jest zaznaczony
   */
  isTagSelected(tagId: number): boolean {
    return this.selectedTagIds().includes(tagId);
  }

  /**
   * Toggle tagu - dodaje lub usuwa z zaznaczonych
   */
  toggleTag(tagId: number): void {
    if (this.disabled()) return;
    
    const current = this.selectedTagIds();
    const newSelection = current.includes(tagId)
      ? current.filter(id => id !== tagId)
      : [...current, tagId];
    
    this.selectionChange.emit(newSelection);
  }

  /**
   * TrackBy function dla optymalizacji ngFor
   */
  trackByTagId(index: number, tag: TagDto): number {
    return tag.id;
  }
}

