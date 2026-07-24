import { Component, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

// --- Interfaces ---
interface UserProfile {
  id?: string;
  Nom: string;
  MTC: number;
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
}

interface EnrichedEvent extends Event {
  ParticipantNames: string[];
  WinnerNames: string[];
}

interface EventsData {
  upcoming: EnrichedEvent[];
  past: EnrichedEvent[];
}

// --- Component ---
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
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

  public eventsData$!: Observable<EventsData>;
  public currentUser: User | null = null;
  public registrationErrors: Record<string, string | null> = {};
  public selectedEventId: string | null = null;
  public isTogglingRegistration: Record<string, boolean> = {};

  ngOnInit(): void {
    this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      this.cd.detectChanges();
    });

    this.loadEventsData();
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

    this.eventsData$ = combineLatest([events$, users$]).pipe(
      map(([events, users]) => this.mapEventsWithUserNames(events, users))
    );
  }

  private mapEventsWithUserNames(
    events: Event[],
    users: UserProfile[]
  ): EventsData {
    const userMap = new Map(users.map((user) => [user.id!, user.Nom]));
    const now = new Date();

    const enrichedEvents: EnrichedEvent[] = events.map((event) => ({
      ...event,
      ParticipantNames: (event.Participants || []).map(
        (email) => userMap.get(email) || email.split('@')[0]
      ),
      WinnerNames: (event.Gagnants || []).map(
        (email) => userMap.get(email) || email.split('@')[0]
      ),
    }));

    const upcoming = enrichedEvents.filter((e) => e.Date.toDate() >= now);
    const past = enrichedEvents.filter((e) => e.Date.toDate() < now).reverse();

    return { upcoming, past };
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

      const userProfile = userDoc.data() as UserProfile;

      // Sécurité : forcer le format Nombre pour éviter les erreurs de calcul
      const userMtc = Number(userProfile.MTC) || 0;
      const eventPrix = Number(event.Prix) || 0;

      if (userMtc < eventPrix) throw new Error('MTC insuffisant.');

      const newMtcBalance = userMtc - eventPrix;

      transaction.update(userDocRef, { MTC: newMtcBalance });
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
      const userDoc = await transaction.get(userDocRef);
      if (userDoc.exists()) {
        const userProfile = userDoc.data() as UserProfile;

        // Sécurité : forcer le format Nombre pour éviter la concaténation de strings
        const userMtc = Number(userProfile.MTC) || 0;
        const eventPrix = Number(event.Prix) || 0;

        const newMtcBalance = userMtc + eventPrix;
        transaction.update(userDocRef, { MTC: newMtcBalance });
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
