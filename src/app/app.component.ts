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
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(
        filter(
          (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'
        )
      )
      .subscribe(() => {
        this.updateAvailable = true;
        // On recharge automatiquement dès que l'onglet passe en arrière-plan
        // (l'utilisateur change d'appli / verrouille son téléphone) : à ce
        // moment il ne regarde plus la page, donc aucun risque d'interrompre
        // une action en cours (connexion Google, envoi d'un formulaire...).
        // Le bandeau reste affiché comme filet de sécurité pour actualiser
        // manuellement si l'onglet ne passe jamais en arrière-plan.
        document.addEventListener(
          'visibilitychange',
          () => {
            if (document.visibilityState === 'hidden') {
              this.reloadForUpdate();
            }
          },
          { once: true }
        );
      });

    // Par défaut, le service worker ne revérifie une nouvelle version qu'au
    // chargement de la page. Comme les utilisateurs gardent souvent l'appli
    // ouverte, on revérifie aussi périodiquement pour détecter les mises à
    // jour même sans redémarrage complet de l'appli.
    setInterval(() => this.swUpdate.checkForUpdate(), 30 * 60 * 1000);
  }

  reloadForUpdate(): void {
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }
}
