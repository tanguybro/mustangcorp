import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

interface UserProfile {
  id?: string;
  Nom: string;
  Points: number;
}

export interface RankedUserProfile extends UserProfile {
  rank: number;
}

interface RankingData {
  users: RankedUserProfile[];
  seasonName: string;
  isCurrentSeason: boolean;
}

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.css'],
})
export class RankingComponent {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  private seasonService = inject(SeasonService);

  currentUser$: Observable<User | null> = authState(this.auth);
  seasons$: Observable<Season[]> = this.seasonService.seasons$;

  // null = saison en cours (défaut)
  private selectedSeasonId$ = new BehaviorSubject<string | null>(null);
  selectedSeasonId = '';

  rankingData$: Observable<RankingData> = combineLatest([
    this.selectedSeasonId$,
    this.seasonService.currentSeason$,
    this.seasons$,
  ]).pipe(
    switchMap(([selectedSeasonId, currentSeason, seasons]) => {
      const seasonId = selectedSeasonId ?? currentSeason?.id;
      if (!seasonId) return of({ users: [], seasonName: '', isCurrentSeason: true });

      const isCurrentSeason = seasonId === currentSeason?.id;
      const seasonName =
        seasons.find((s) => s.id === seasonId)?.Nom ?? seasonId;

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
          return {
            users: this.rank(filteredUsers),
            seasonName,
            isCurrentSeason,
          };
        })
      );
    })
  );

  selectSeason(seasonId: string): void {
    this.selectedSeasonId$.next(seasonId || null);
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
