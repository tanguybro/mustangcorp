import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
} from '@angular/fire/firestore';
// AJOUT : Importer Auth et authState
import { Auth, authState, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface UserProfile {
  id?: string;
  Nom: string;
  Points: number;
  MTC: number;
}

export interface RankedUserProfile extends UserProfile {
  rank: number;
}

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.css'],
})
export class RankingComponent {
  private firestore: Firestore = inject(Firestore);
  // AJOUT : Injecter le service Auth
  private auth: Auth = inject(Auth);

  rankedUsers$: Observable<RankedUserProfile[]>;
  // AJOUT : Créer un observable pour l'utilisateur connecté
  currentUser$: Observable<User | null> = authState(this.auth);

  constructor() {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, orderBy('Points', 'desc'));

    const users$ = collectionData(q, {
      idField: 'id',
    }) as Observable<UserProfile[]>;

    this.rankedUsers$ = users$.pipe(
      map((users) => {
        const filteredUsers = users.filter(
          (user) => user.id !== 'tanguy.brouassin@gmail.com'
        );

        let rank = 0;
        let lastPoints = -1;

        return filteredUsers.map((user, index) => {
          if (user.Points !== lastPoints) {
            rank = index + 1;
          }
          lastPoints = user.Points;
          return { ...user, rank };
        });
      })
    );
  }
}
