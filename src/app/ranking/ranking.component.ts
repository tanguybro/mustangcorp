import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Auth, authState, User } from '@angular/fire/auth';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { RANKING_EXCLUDED_EMAIL } from '../shared/constants';
import { Season, SeasonService } from '../shared/season.service';
import { SeasonSwitcherComponent } from '../shared/season-switcher/season-switcher.component';

interface UserProfile {
  id?: string;
  Nom: string;
  Points: number;
}

export interface RankedUserProfile extends UserProfile {
  rank: number;
}

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule, SeasonSwitcherComponent],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.css'],
})
export class RankingComponent {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  private seasonService = inject(SeasonService);

  currentUser$: Observable<User | null> = authState(this.auth);
  seasons$: Observable<Season[]> = this.seasonService.seasons$;

  // null tant que l'utilisateur n'a pas navigué : on suit la saison en cours.
  private selectedSeasonId$ = new BehaviorSubject<string | null>(null);

  effectiveSeasonId$: Observable<string> = combineLatest([
    this.selectedSeasonId$,
    this.seasonService.currentSeason$,
  ]).pipe(map(([selected, current]) => selected ?? current?.id ?? ''));

  rankedUsers$: Observable<RankedUserProfile[]> = combineLatest([
    this.effectiveSeasonId$,
    this.seasonService.currentSeason$,
  ]).pipe(
    switchMap(([seasonId, currentSeason]) => {
      if (!seasonId) return of([]);

      const isCurrentSeason = seasonId === currentSeason?.id;
      const usersCollectionPath = isCurrentSeason
        ? 'users'
        : `seasons/${seasonId}/classement`;

      const q = query(
        collection(this.firestore, usersCollectionPath),
        orderBy('Points', 'desc')
      );

      return (collectionData(q, { idField: 'id' }) as Observable<UserProfile[]>).pipe(
        map((users) => {
          const filteredUsers = isCurrentSeason
            ? users.filter((user) => user.id !== RANKING_EXCLUDED_EMAIL)
            : users;
          return this.rank(filteredUsers);
        })
      );
    })
  );

  selectSeason(seasonId: string): void {
    this.selectedSeasonId$.next(seasonId);
  }

  private rank(users: UserProfile[]): RankedUserProfile[] {
    let rank = 0;
    let lastPoints = -1;

    return users.map((user, index) => {
      if (user.Points !== lastPoints) {
        rank = index + 1;
      }
      lastPoints = user.Points;
      return { ...user, rank };
    });
  }
}
