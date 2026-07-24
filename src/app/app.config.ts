// src/app/app.config.ts
import { ApplicationConfig, isDevMode, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';

// Imports pour la configuration de la langue (Français)
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

// Imports Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';
import { provideServiceWorker } from '@angular/service-worker';

// Étape cruciale : Enregistrement des données de la langue française
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    // Provider pour le routeur
    provideRouter(routes),
    provideAnimations(),

    // Étape cruciale : Dire à Angular d'utiliser le français par défaut
    { provide: LOCALE_ID, useValue: 'fr-FR' },

    // Providers pour Firebase
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
