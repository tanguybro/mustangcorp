import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
// Marge de sécurité avant l'expiration réelle du jeton (~1h côté Google).
const TOKEN_LIFETIME_MS = 55 * 60 * 1000;

export interface CalendarEventParams {
  summary: string;
  description: string;
  location: string;
  startDate: Date;
  durationHours: number;
}

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private auth: Auth = inject(Auth);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  isConnected(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiresAt;
  }

  async connect(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.addScope(CALENDAR_SCOPE);
    // Force l'écran de consentement Google pour être sûr d'obtenir un jeton
    // avec le scope Calendar, même si l'utilisateur est déjà connecté.
    provider.setCustomParameters({ prompt: 'consent' });

    const result = await signInWithPopup(this.auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Aucun jeton d'accès Google Calendar obtenu.");
    }
    this.accessToken = credential.accessToken;
    this.tokenExpiresAt = Date.now() + TOKEN_LIFETIME_MS;
  }

  async createEvent(params: CalendarEventParams): Promise<string> {
    const token = this.requireToken();
    const start = params.startDate;
    const end = new Date(start.getTime() + params.durationHours * 60 * 60 * 1000);

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: params.summary,
          description: params.description,
          location: params.location,
          start: { dateTime: start.toISOString(), timeZone: 'Europe/Paris' },
          end: { dateTime: end.toISOString(), timeZone: 'Europe/Paris' },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Erreur création Google Calendar : ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return data.id as string;
  }

  async updateAttendees(
    calendarEventId: string,
    attendeeEmails: string[]
  ): Promise<void> {
    const token = this.requireToken();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}?sendUpdates=all`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendees: attendeeEmails.map((email) => ({ email })),
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Erreur mise à jour Google Calendar : ${res.status} ${await res.text()}`);
    }
  }

  private requireToken(): string {
    if (!this.isConnected()) {
      throw new Error('Google Calendar non connecté.');
    }
    return this.accessToken!;
  }
}
