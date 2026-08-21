import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { Season, SeasonService } from '../shared/season.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  private firestore: Firestore = inject(Firestore);
  private seasonService = inject(SeasonService);

  seasons$: Observable<Season[]> = this.seasonService.seasons$;

  nom = '';
  date = ''; // valeur d'un <input type="datetime-local">
  lieu = '';
  prix: number | null = null;
  max: number | null = null;
  description = '';
  saisonId = '';

  saving = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    // Présélectionne la saison en cours dès qu'on la connaît.
    this.seasonService.currentSeason$.pipe(take(1)).subscribe((season) => {
      if (season?.id) {
        this.saisonId = season.id;
      }
    });
  }

  async createEvent(): Promise<void> {
    this.successMessage = '';
    this.errorMessage = '';

    if (
      !this.nom ||
      !this.date ||
      !this.lieu ||
      this.prix === null ||
      this.max === null ||
      !this.saisonId
    ) {
      this.errorMessage = 'Merci de remplir tous les champs obligatoires.';
      return;
    }

    this.saving = true;
    try {
      await addDoc(collection(this.firestore, 'events'), {
        Nom: this.nom,
        Date: Timestamp.fromDate(new Date(this.date)),
        Lieu: this.lieu,
        Prix: this.prix,
        Max: this.max,
        Description: this.description,
        Saison: this.saisonId,
        Participants: [],
      });
      this.successMessage = `"${this.nom}" a été créé.`;
      this.resetForm();
    } catch (error) {
      console.error('Create event error:', error);
      this.errorMessage = "Erreur lors de la création de l'événement.";
    } finally {
      this.saving = false;
    }
  }

  private resetForm(): void {
    this.nom = '';
    this.date = '';
    this.lieu = '';
    this.prix = null;
    this.max = null;
    this.description = '';
    // On garde la saison sélectionnée pour enchaîner facilement plusieurs créations.
  }
}
