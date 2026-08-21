import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  doc,
  getDoc,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Season, SeasonService } from '../shared/season.service';
import { GoogleCalendarService } from '../shared/google-calendar.service';

interface UserProfile {
  id?: string;
  Nom: string;
}

interface AdminEvent {
  id?: string;
  Nom: string;
  Date: Timestamp;
  Participants: string[];
  GoogleCalendarEventId?: string;
}

interface UpcomingEvent extends AdminEvent {
  ParticipantNames: string[];
}

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
  private calendarService = inject(GoogleCalendarService);

  seasons$: Observable<Season[]> = this.seasonService.seasons$;

  nom = '';
  date = ''; // valeur d'un <input type="datetime-local">
  lieu = '';
  prix: number | null = null;
  max: number | null = null;
  dureeHeures = 2;
  description = '';
  saisonId = '';

  saving = false;
  successMessage = '';
  errorMessage = '';

  calendarConnecting = false;
  calendarError = '';

  upcomingEvents$!: Observable<UpcomingEvent[]>;
  syncingEventId: string | null = null;
  syncMessage: Record<string, string> = {};

  ngOnInit(): void {
    // Présélectionne la saison en cours dès qu'on la connaît.
    this.seasonService.currentSeason$.pipe(take(1)).subscribe((season) => {
      if (season?.id) {
        this.saisonId = season.id;
      }
    });

    const eventsQuery = query(
      collection(this.firestore, 'events'),
      where('Date', '>=', Timestamp.now()),
      orderBy('Date', 'asc')
    );
    const events$ = collectionData(eventsQuery, {
      idField: 'id',
    }) as Observable<AdminEvent[]>;
    const users$ = collectionData(collection(this.firestore, 'users'), {
      idField: 'id',
    }) as Observable<UserProfile[]>;

    this.upcomingEvents$ = combineLatest([events$, users$]).pipe(
      map(([events, users]) => {
        const nameByEmail = new Map(users.map((u) => [u.id!, u.Nom]));
        return events.map((event) => ({
          ...event,
          ParticipantNames: (event.Participants || []).map(
            (email) => nameByEmail.get(email) || email.split('@')[0]
          ),
        }));
      })
    );
  }

  get isCalendarConnected(): boolean {
    return this.calendarService.isConnected();
  }

  async connectCalendar(): Promise<void> {
    this.calendarError = '';
    this.calendarConnecting = true;
    try {
      await this.calendarService.connect();
    } catch (error) {
      console.error('Calendar connect error:', error);
      this.calendarError = 'Connexion à Google Calendar impossible.';
    } finally {
      this.calendarConnecting = false;
      this.cd.detectChanges();
    }
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
      const eventDate = new Date(this.date);

      let googleCalendarEventId: string | undefined;
      if (this.isCalendarConnected) {
        try {
          googleCalendarEventId = await this.calendarService.createEvent({
            summary: `Mustang Club - ${this.nom}`,
            description: this.description,
            location: this.lieu,
            startDate: eventDate,
            durationHours: this.dureeHeures,
          });
        } catch (calendarError) {
          console.error('Calendar create error:', calendarError);
          // On continue quand même : l'événement du site n'a pas à échouer
          // si seule la création de l'invitation Calendar échoue.
        }
      }

      await setDoc(doc(this.firestore, 'events', id), {
        Nom: this.nom,
        Date: Timestamp.fromDate(eventDate),
        Lieu: this.lieu,
        Prix: this.prix,
        Max: this.max,
        Description: this.description,
        Saison: this.saisonId,
        Participants: [],
        ...(googleCalendarEventId ? { GoogleCalendarEventId: googleCalendarEventId } : {}),
      });

      this.successMessage = googleCalendarEventId
        ? `"${this.nom}" a été créé (id: ${id}), invitation Google Calendar créée.`
        : `"${this.nom}" a été créé (id: ${id}). Connecte Google Calendar pour créer l'invitation.`;
      this.resetForm();
    } catch (error) {
      console.error('Create event error:', error);
      this.errorMessage = "Erreur lors de la création de l'événement.";
    } finally {
      this.saving = false;
      this.cd.detectChanges();
    }
  }

  async syncAttendees(event: UpcomingEvent): Promise<void> {
    if (!event.id) return;
    this.syncMessage[event.id] = '';

    if (!this.isCalendarConnected) {
      this.syncMessage[event.id] = 'Connecte Google Calendar avant de synchroniser.';
      this.cd.detectChanges();
      return;
    }

    this.syncingEventId = event.id;
    try {
      let calendarEventId = event.GoogleCalendarEventId;

      if (!calendarEventId) {
        // Ancien événement, ou créé sans être connecté à Calendar à l'époque :
        // on crée l'invitation maintenant plutôt que d'échouer.
        calendarEventId = await this.calendarService.createEvent({
          summary: `Mustang Club - ${event.Nom}`,
          description: '',
          location: '',
          startDate: event.Date.toDate(),
          durationHours: 2,
        });
        await updateDoc(doc(this.firestore, 'events', event.id), {
          GoogleCalendarEventId: calendarEventId,
        });
      }

      await this.calendarService.updateAttendees(
        calendarEventId,
        event.Participants || []
      );
      this.syncMessage[event.id] = `Synchronisé (${(event.Participants || []).length} participant(s)).`;
    } catch (error) {
      console.error('Sync error:', error);
      this.syncMessage[event.id] = 'Erreur lors de la synchronisation.';
    } finally {
      this.syncingEventId = null;
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
    this.dureeHeures = 2;
    this.description = '';
    // On garde la saison sélectionnée pour enchaîner facilement plusieurs créations.
  }
}
