import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth, authState, getRedirectResult, User } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Observable, of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { ADMIN_EMAIL } from './shared/constants';

// Interface pour les données utilisateur Firestore
interface UserProfile {
  id?: string;
  Nom: string;
  Solde: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'Mustang Club';

  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private swUpdate: SwUpdate = inject(SwUpdate);

  // Observable de l'utilisateur connecté
  user$: Observable<User | null> = authState(this.auth);

  isAdmin$: Observable<boolean> = this.user$.pipe(
    map((user) => user?.email === ADMIN_EMAIL)
  );

  updateAvailable = false;

  // Observable des données du profil Firestore (MTC)
  userProfile$: Observable<UserProfile | null> = this.user$.pipe(
    switchMap((user) => {
      if (!user?.email) return of(null);
      const profileDocRef = doc(this.firestore, `users/${user.email}`);
      return docData(profileDocRef, {
        idField: 'id',
      }) as Observable<UserProfile>;
    })
  );

  ngOnInit(): void {
    // Termine d'abord une éventuelle connexion Google en cours (retour de
    // signInWithRedirect) AVANT de surveiller les mises à jour du service
    // worker : sinon un rechargement auto pouvait interrompre Firebase en
    // plein milieu de l'établissement de la session et la faire disparaître.
    getRedirectResult(this.auth)
      .catch((error) => console.error('Google redirect error:', error))
      .finally(() => this.watchForNewVersion());
  }

  private watchForNewVersion(): void {
    // Signale qu'une nouvelle version est disponible au lieu de recharger la
    // page automatiquement : un rechargement forcé pouvait retomber en plein
    // milieu d'une action en cours (connexion Google, envoi d'un formulaire...)
    // et l'interrompre. L'utilisateur choisit quand actualiser.
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter(
            (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'
          )
        )
        .subscribe(() => {
          this.updateAvailable = true;
        });
    }
  }

  reloadForUpdate(): void {
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }
}
