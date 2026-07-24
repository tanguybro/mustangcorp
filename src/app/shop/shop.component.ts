import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
// MODIFICATION : Importer 'query' et 'orderBy'
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

interface Article {
  id?: string;
  Nom: string;
  Prix: number;
  Image: string;
}

interface UserProfile {
  id?: string;
  MTC: number;
}

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.css'],
})
export class ShopComponent {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  articles$: Observable<Article[]>;
  userMtc$: Observable<number | null>;

  constructor() {
    const articleCollection = collection(this.firestore, 'shop');
    // MODIFICATION : Création d'une requête pour trier par 'Prix' en ordre décroissant ('desc')
    const q = query(articleCollection, orderBy('Prix', 'desc'));

    // On utilise la nouvelle requête 'q' pour récupérer les données
    this.articles$ = collectionData(q, {
      idField: 'id',
    }) as Observable<Article[]>;

    this.userMtc$ = authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.email) return of(null);
        const profileDocRef = doc(this.firestore, `users/${user.email}`);
        return (docData(profileDocRef) as Observable<UserProfile | undefined>).pipe(
          map((profile) => (profile ? Number(profile.MTC) || 0 : null))
        );
      })
    );
  }

  /**
   * Affiche une alerte lorsque l'utilisateur clique sur le bouton d'achat.
   */
  onBuyClick(): void {
    alert('Pas encore implementé, envoie moi un message');
  }
}
