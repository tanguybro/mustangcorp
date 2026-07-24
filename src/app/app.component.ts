import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth, authState, User } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Observable, of } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

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
    // Recharge automatiquement la page dès qu'une nouvelle version est déployée,
    // pour éviter de rester bloqué sur une version en cache par le service worker.
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter(
            (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'
          )
        )
        .subscribe(() => {
          this.swUpdate.activateUpdate().then(() => document.location.reload());
        });
    }
  }
}
