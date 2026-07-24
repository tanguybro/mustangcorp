import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Season {
  id?: string;
  Nom: string;
  DateDebut: Timestamp;
  DateFin: Timestamp | null;
  EstActuelle: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly firestore = inject(Firestore);

  // Les plus récentes d'abord.
  readonly seasons$: Observable<Season[]> = collectionData(
    query(collection(this.firestore, 'seasons'), orderBy('DateDebut', 'desc')),
    { idField: 'id' }
  ) as Observable<Season[]>;

  readonly currentSeason$: Observable<Season | null> = this.seasons$.pipe(
    map((seasons) => seasons.find((s) => s.EstActuelle) ?? null)
  );
}
