import { Component, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import {
  Firestore,
  collection,
  collectionData,
  Timestamp,
  query,
  orderBy,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
} from '@angular/fire/firestore';
import { Auth, User } from '@angular/fire/auth';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FREE_REGISTRATION_EMAIL } from '../shared/constants';
import { Season, SeasonService } from '../shared/season.service';

// --- Interfaces ---
interface UserProfile {
  id?: string;
  Nom: string;
  MTC: number;
  Solde: number;
  Points?: number;
}

interface Event {
  id?: string;
  Nom: string;
  Date: Timestamp;
  Lieu: string;
  Prix: number | string;
  Participants: string[];
  Max: number;
  Description: string;
  Gagnants?: string[];
  Saison?: string;
}

interface EnrichedEvent extends Event {
  ParticipantNames: string[];
  WinnerNames: string[];
}

interface EventsData {
  upcoming: EnrichedEvent[];
  past: EnrichedEvent[];
  seasonName: string;
  isCurrentSeason: boolean;
}

// --- Component ---
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
  animations: [
    trigger('detailExpand', [
      state(
        'collapsed',
        style({ height: '0px', minHeight: '0', opacity: 0, padding: '0 18px' })
      ),
      state(
        'expanded',
        style({ height: '*', opacity: 1, padding: '14px 18px' })
      ),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})
export class CalendarComponent implements OnInit {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly seasonService = inject(SeasonService);

  public eventsData$!: Observable<EventsData>;
  public seasons$: Observable<Season[]> = this.seasonService.seasons$;
  public currentUser: User | null = null;
  public registrationErrors: Record<string, string | null> = {};
  public selectedEventId: string | null = null;
  public isTogglingRegistration: Record<string, boolean> = {};

  // '' = saison en cours (défaut)
  private selectedSeasonId$ = new BehaviorSubject<string>('');
  public selectedSeasonId = '';

  ngOnInit(): void {
    this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      this.cd.detectChanges();
    });

    this.loadEventsData();
  }

  selectSeason(seasonId: string): void {
    this.selectedSeasonId$.next(seasonId);
  }

  private loadEventsData(): void {
    const eventsRef = collection(this.firestore, 'events');
    const usersRef = collection(this.firestore, 'users');

    const events$ = collectionData(query(eventsRef, orderBy('Date', 'asc')), {
      idField: 'id',
    }) as Observable<Event[]>;
    const users$ = collectionData(usersRef, { idField: 'id' }) as Observable<
      UserProfile[]
    >;

    this.eventsData$ = combineLatest([
      events$,
      users$,
      this.selectedSeasonId$,
      this.seasonService.currentSeason$,
      this.seasons$,
    ]).pipe(
      map(([events, users, selectedSeasonId, currentSeason, seasons]) =>
        this.mapEventsWithUserNames(
          events,
          users,
          selectedSeasonId,
          currentSeason,
          seasons
        )
      )
    );
  }

  private mapEventsWithUserNames(
    events: Event[],
    users: UserProfile[],
    selectedSeasonId: string,
    currentSeason: Season | null,
    seasons: Season[]
  ): EventsData {
    const userMap = new Map(users.map((user) => [user.id!, user.Nom]));
    const now = new Date();

    const enrich = (event: Event): EnrichedEvent => ({
      ...event,
      ParticipantNames: (event.Participants || []).map(
        (email) => userMap.get(email) || email.split('@')[0]
      ),
      WinnerNames: (event.Gagnants || []).map(
        (email) => userMap.get(email) || email.split('@')[0]
      ),
    });

    const activeSeasonId = selectedSeasonId || currentSeason?.id || null;
    const isCurrentSeason = !selectedSeasonId || activeSeasonId === currentSeason?.id;
    const seasonName =
      seasons.find((s) => s.id === activeSeasonId)?.Nom ?? '';

    const seasonEvents = activeSeasonId
      ? events.filter((e) => e.Saison === activeSeasonId)
      : events;

    if (isCurrentSeason) {
      const enrichedEvents = seasonEvents.map(enrich);
      const upcoming = enrichedEvents.filter((e) => e.Date.toDate() >= now);
      const past = enrichedEvents
        .filter((e) => e.Date.toDate() < now)
        .reverse();
      return { upcoming, past, seasonName, isCurrentSeason };
    }

    // Saison passée : tout est déjà terminé, pas d'événements à venir.
    const past = seasonEvents
      .map(enrich)
      .sort((a, b) => b.Date.toMillis() - a.Date.toMillis());
    return { upcoming: [], past, seasonName, isCurrentSeason };
  }

  toggleDetails(eventId: string | undefined): void {
    if (!eventId) return;
    this.selectedEventId = this.selectedEventId === eventId ? null : eventId;
  }

  isUserRegistered(event: Event): boolean {
    return (
      !!this.currentUser?.email &&
      (event.Participants || []).includes(this.currentUser.email)
    );
  }

  isRegistrationFree(): boolean {
    return this.currentUser?.email === FREE_REGISTRATION_EMAIL;
  }

  async toggleRegistration(event: Event): Promise<void> {
    const eventId = event.id;
    if (!eventId || this.isTogglingRegistration[eventId]) {
      return;
    }

    this.isTogglingRegistration[eventId] = true;
    this.registrationErrors[eventId] = null;
    this.cd.detectChanges();

    try {
      if (this.isUserRegistered(event)) {
        await this.unregister(event);
      } else {
        await this.register(event);
      }
    } catch (error: any) {
      this.handleRegistrationError(eventId, error.message);
    } finally {
      this.isTogglingRegistration[eventId] = false;
      this.cd.detectChanges();
    }
  }

  private async register(event: Event): Promise<void> {
    const eventId = event.id!;
    if (!this.currentUser?.email) {
      this.router.navigate(['/profile']);
      return;
    }

    const userEmail = this.currentUser.email;
    const userDocRef = doc(this.firestore, `users/${userEmail}`);
    const eventDocRef = doc(this.firestore, `events/${eventId}`);

    await runTransaction(this.firestore, async (transaction) => {
      const eventDoc = await transaction.get(eventDocRef);
      if (!eventDoc.exists()) throw new Error("Cet événement n'existe plus.");

      const currentEventData = eventDoc.data() as Event;
      if (
        (currentEventData.Participants || []).length >= currentEventData.Max
      ) {
        throw new Error("L'événement est complet.");
      }

      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) throw new Error('Profil introuvable.');

      // Inscription gratuite pour ce compte, aucun débit du solde.
      if (userEmail === FREE_REGISTRATION_EMAIL) {
        transaction.update(eventDocRef, {
          Participants: arrayUnion(userEmail),
        });
        return;
      }

      const userProfile = userDoc.data() as UserProfile;

      // Sécurité : forcer le format Nombre pour éviter les erreurs de calcul
      const userSolde = Number(userProfile.Solde) || 0;
      const eventPrix = Number(event.Prix) || 0;

      if (userSolde < eventPrix) throw new Error('Solde insuffisant.');

      const newSolde = userSolde - eventPrix;

      transaction.update(userDocRef, { Solde: newSolde });
      transaction.update(eventDocRef, { Participants: arrayUnion(userEmail) });
    });
  }

  private async unregister(event: Event): Promise<void> {
    const eventId = event.id!;
    const userEmail = this.currentUser!.email!;

    const eventTime = event.Date.toDate().getTime();
    if ((eventTime - Date.now()) / (1000 * 60 * 60) < 24) {
      throw new Error('Désinscription impossible moins de 24h avant.');
    }

    const userDocRef = doc(this.firestore, `users/${userEmail}`);
    const eventDocRef = doc(this.firestore, `events/${eventId}`);

    await runTransaction(this.firestore, async (transaction) => {
      // Inscription gratuite pour ce compte : rien n'a été débité, rien à rembourser.
      if (userEmail !== FREE_REGISTRATION_EMAIL) {
        const userDoc = await transaction.get(userDocRef);
        if (userDoc.exists()) {
          const userProfile = userDoc.data() as UserProfile;

          // Sécurité : forcer le format Nombre pour éviter la concaténation de strings
          const userSolde = Number(userProfile.Solde) || 0;
          const eventPrix = Number(event.Prix) || 0;

          const newSolde = userSolde + eventPrix;
          transaction.update(userDocRef, { Solde: newSolde });
        }
      }
      transaction.update(eventDocRef, { Participants: arrayRemove(userEmail) });
    });
  }

  private handleRegistrationError(eventId: string, message: string): void {
    console.error(`Erreur pour l'événement ${eventId}:`, message);
    this.registrationErrors[eventId] = message || 'Une erreur est survenue.';
    this.cd.detectChanges();

    setTimeout(() => {
      this.registrationErrors[eventId] = null;
      this.cd.detectChanges();
    }, 4000);
  }
}
