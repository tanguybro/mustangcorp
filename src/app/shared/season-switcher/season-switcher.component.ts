import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Season } from '../season.service';

@Component({
  selector: 'app-season-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './season-switcher.component.html',
  styleUrls: ['./season-switcher.component.css'],
})
export class SeasonSwitcherComponent {
  @Input() seasons: Season[] = [];
  @Input() selectedSeasonId = '';
  @Output() selectedSeasonIdChange = new EventEmitter<string>();

  get currentIndex(): number {
    return this.seasons.findIndex((s) => s.id === this.selectedSeasonId);
  }

  get currentLabel(): string {
    return this.seasons[this.currentIndex]?.Nom ?? '';
  }

  // Les saisons sont triées de la plus récente à la plus ancienne :
  // "précédente" = index suivant (plus ancien), "suivante" = index précédent (plus récent).
  get canGoPrevious(): boolean {
    return (
      this.currentIndex >= 0 && this.currentIndex < this.seasons.length - 1
    );
  }

  get canGoNext(): boolean {
    return this.currentIndex > 0;
  }

  previous(): void {
    if (this.canGoPrevious) {
      this.selectedSeasonIdChange.emit(this.seasons[this.currentIndex + 1].id!);
    }
  }

  next(): void {
    if (this.canGoNext) {
      this.selectedSeasonIdChange.emit(this.seasons[this.currentIndex - 1].id!);
    }
  }
}
