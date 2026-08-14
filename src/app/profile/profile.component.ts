import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Auth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  authState,
  User,
} from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  docData,
  collectionData,
  query,
  orderBy,
  where,
  Timestamp,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { RANKING_EXCLUDED_EMAIL } from '../shared/constants';
import { Season, SeasonService } from '../shared/season.service';
import { SeasonSwitcherComponent } from '../shared/season-switcher/season-switcher.component';

// --- INTERFACES ---
interface UserProfile {
  id?: string;
  Nom: string;
  MTC: number;
  Solde: number;
  Points: number;
}

interface FullUserProfile extends UserProfile {
  rank: number;
}

interface Event {
  id?: string;
  Nom: string;
  Date: Timestamp;
  Gagnants?: string[];
  Participants: string[];
  Saison?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SeasonSwitcherComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private cd: ChangeDetectorRef = inject(ChangeDetectorRef);
  private seasonService = inject(SeasonService);

  public user$: Observable<User | null> = authState(this.auth);
  public userProfileWithRank$: Observable<FullUserProfile | null>;
  public registeredEvents$: Observable<Event[]>;
  public pastRegisteredEvents$: Observable<Event[]>;
  public wonEvents$: Observable<Event[]>;

  public seasons$: Observable<Season[]> = this.seasonService.seasons$;
  private selectedSeasonId$ = new BehaviorSubject<string>('');
  public effectiveSeasonId$: Observable<string> = combineLatest([
    this.selectedSeasonId$,
    this.seasonService.currentSeason$,
  ]).pipe(map(([selected, current]) => selected || current?.id || ''));

  email = '';
  password = '';
  loginError: string | null = null;

  constructor() {
    // Le résultat de la redirection Google (succès ou erreur) est géré une
    // seule fois, au niveau racine (AppComponent) : authState() ci-dessus
    // reflète automatiquement une connexion réussie une fois traitée là-bas.

    // La logique pour le profil et le classement reste la même
    this.userProfileWithRank$ = this.user$.pipe(
      switchMap((user) => {
        if (!user || !user.email) {
          return of(null);
        }
        const profileDocRef = doc(this.firestore, `users/${user.email}`);
        const userProfile$ = docData(profileDocRef, {
          idField: 'id',
        }) as Observable<UserProfile>;

        const usersCollectionRef = collection(this.firestore, 'users');
        const rankedUsersQuery = query(
          usersCollectionRef,
          orderBy('Points', 'desc')
        );
        const rankedUsers$ = collectionData(rankedUsersQuery, {
          idField: 'id',
        }) as Observable<UserProfile[]>;

        return combineLatest([userProfile$, rankedUsers$]).pipe(
          map(([profile, rankedUsers]) => {
            if (!profile) {
              console.error("Profil non trouvé pour l'email:", user.email);
              return null;
            }
            const rankableUsers = rankedUsers.filter(
              (u) => u.id !== RANKING_EXCLUDED_EMAIL
            );
            const rank =
              rankableUsers.findIndex((u) => u.id === profile.id) + 1;
            return { ...profile, rank };
          })
        );
      })
    );

    // --- LOGIQUE DES ÉVÉNEMENTS MISE À JOUR (SANS INDEX COMPOSITE) ---
    const eventsCollectionRef = collection(this.firestore, 'events');

    // Événements à venir auxquels l'utilisateur est inscrit
    this.registeredEvents$ = this.user$.pipe(
      switchMap((user) => {
        if (!user || !user.email) return of([]);

        // 1. Requête Firestore simplifiée (ne nécessite pas d'index composite)
        const registeredQuery = query(
          eventsCollectionRef,
          where('Participants', 'array-contains', user.email)
        );

        return (
          collectionData(registeredQuery, { idField: 'id' }) as Observable<
            Event[]
          >
        ).pipe(
          // 2. Filtrage et tri côté client (dans l'application)
          map(
            (events) =>
              events
                .filter((event) => event.Date.toDate() >= new Date()) // Garde les événements futurs
                .sort((a, b) => a.Date.toMillis() - b.Date.toMillis()) // Trie par date croissante
          )
        );
      })
    );

    // Événements passés auxquels l'utilisateur était inscrit (gagnés ou non),
    // filtrés sur la saison sélectionnée (en cours par défaut).
    this.pastRegisteredEvents$ = combineLatest([
      this.user$,
      this.effectiveSeasonId$,
    ]).pipe(
      switchMap(([user, seasonId]) => {
        if (!user || !user.email || !seasonId) return of([]);

        const registeredQuery = query(
          eventsCollectionRef,
          where('Participants', 'array-contains', user.email)
        );

        return (
          collectionData(registeredQuery, { idField: 'id' }) as Observable<
            Event[]
          >
        ).pipe(
          map((events) =>
            events
              .filter(
                (event) =>
                  event.Date.toDate() < new Date() && event.Saison === seasonId
              )
              .sort((a, b) => b.Date.toMillis() - a.Date.toMillis())
          )
        );
      })
    );

    // Événements que l'utilisateur a gagnés, filtrés sur la saison sélectionnée.
    this.wonEvents$ = combineLatest([this.user$, this.effectiveSeasonId$]).pipe(
      switchMap(([user, seasonId]) => {
        if (!user || !user.email || !seasonId) return of([]);

        // 1. Requête Firestore simplifiée
        const wonQuery = query(
          eventsCollectionRef,
          where('Gagnants', 'array-contains', user.email)
        );

        return (
          collectionData(wonQuery, { idField: 'id' }) as Observable<Event[]>
        ).pipe(
          // 2. Filtrage et tri côté client
          map((events) =>
            events
              .filter(
                (event) =>
                  event.Date.toDate() < new Date() && event.Saison === seasonId
              )
              .sort((a, b) => b.Date.toMillis() - a.Date.toMillis())
          )
        );
      })
    );
  }

  selectSeason(seasonId: string): void {
    this.selectedSeasonId$.next(seasonId);
  }

  async login() {
    this.loginError = null;
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);
    } catch (error) {
      console.error('Login error:', error);
      this.loginError = 'Email ou mot de passe incorrect.';
      this.cd.detectChanges();
    }
  }

  async loginWithGoogle() {
    this.loginError = null;
    try {
      await signInWithRedirect(this.auth, new GoogleAuthProvider());
    } catch (error) {
      console.error('Google login error:', error);
      this.loginError = 'Connexion Google impossible.';
      this.cd.detectChanges();
    }
  }

  async logout() {
    await signOut(this.auth);
  }
}
