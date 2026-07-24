import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
// MODIFICATION : Importer 'query' et 'orderBy'
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

interface Article {
  id?: string;
  Nom: string;
  Prix: number;
  Image: string;
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
  articles$: Observable<Article[]>;

  constructor() {
    const articleCollection = collection(this.firestore, 'shop');
    // MODIFICATION : Création d'une requête pour trier par 'Prix' en ordre décroissant ('desc')
    const q = query(articleCollection, orderBy('Prix', 'desc'));

    // On utilise la nouvelle requête 'q' pour récupérer les données
    this.articles$ = collectionData(q, {
      idField: 'id',
    }) as Observable<Article[]>;
  }

  /**
   * Affiche une alerte lorsque l'utilisateur clique sur le bouton d'achat.
   */
  onBuyClick(): void {
    alert('Pas encore implementé, envoie moi un message');
  }
}
