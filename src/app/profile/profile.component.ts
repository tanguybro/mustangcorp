import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Auth,
  signInWithEmailAndPassword,
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
import { Observable, of, combineLatest } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

// --- INTERFACES ---
interface UserProfile {
  id?: string;
  Nom: string;
  MTC: number;
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
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private cd: ChangeDetectorRef = inject(ChangeDetectorRef);

  public user$: Observable<User | null> = authState(this.auth);
  public userProfileWithRank$: Observable<FullUserProfile | null>;
  public registeredEvents$: Observable<Event[]>;
  public wonEvents$: Observable<Event[]>;

  email = '';
  password = '';
  loginError: string | null = null;

  constructor() {
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
            const rank = rankedUsers.findIndex((u) => u.id === profile.id) + 1;
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

    // Événements passés que l'utilisateur a gagnés
    this.wonEvents$ = this.user$.pipe(
      switchMap((user) => {
        if (!user || !user.email) return of([]);

        // 1. Requête Firestore simplifiée
        const wonQuery = query(
          eventsCollectionRef,
          where('Gagnants', 'array-contains', user.email)
        );

        return (
          collectionData(wonQuery, { idField: 'id' }) as Observable<Event[]>
        ).pipe(
          // 2. Filtrage et tri côté client
          map(
            (events) =>
              events
                .filter((event) => event.Date.toDate() < new Date()) // Garde les événements passés
                .sort((a, b) => b.Date.toMillis() - a.Date.toMillis()) // Trie par date décroissante
          )
        );
      })
    );
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

  async logout() {
    await signOut(this.auth);
  }
}
