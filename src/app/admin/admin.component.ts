import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  Timestamp,
  doc,
  getDoc,
  setDoc,
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
  private cd: ChangeDetectorRef = inject(ChangeDetectorRef);

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
      const id = await this.generateUniqueId(this.nom);
      await setDoc(doc(this.firestore, 'events', id), {
        Nom: this.nom,
        Date: Timestamp.fromDate(new Date(this.date)),
        Lieu: this.lieu,
        Prix: this.prix,
        Max: this.max,
        Description: this.description,
        Saison: this.saisonId,
        Participants: [],
      });
      this.successMessage = `"${this.nom}" a été créé (id: ${id}).`;
      this.resetForm();
    } catch (error) {
      console.error('Create event error:', error);
      this.errorMessage = "Erreur lors de la création de l'événement.";
    } finally {
      this.saving = false;
      this.cd.detectChanges();
    }
  }

  private static readonly ACCENTS: Record<string, string> = {
    à: 'a',
    â: 'a',
    ä: 'a',
    é: 'e',
    è: 'e',
    ê: 'e',
    ë: 'e',
    î: 'i',
    ï: 'i',
    ô: 'o',
    ö: 'o',
    ù: 'u',
    û: 'u',
    ü: 'u',
    ç: 'c',
  };

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .split('')
      .map((ch) => AdminComponent.ACCENTS[ch] ?? ch)
      .join('')
      .replace(/[^a-z0-9]+/g, '');
  }

  // Essaie le nom tel quel, puis lui ajoute 2, 3, 4... tant que l'id existe déjà.
  private async generateUniqueId(nom: string): Promise<string> {
    const base = this.slugify(nom);
    let candidate = base;
    let suffix = 2;

    while ((await getDoc(doc(this.firestore, 'events', candidate))).exists()) {
      candidate = `${base}${suffix}`;
      suffix++;
    }

    return candidate;
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
