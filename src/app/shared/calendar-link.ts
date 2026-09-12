// Génère un lien "Ajouter à mon agenda" personnel (Google Agenda) ou un
// fichier .ics téléchargeable (Apple Calendar, Outlook, etc.), sans passer
// par une API ni un compte Google admin : chacun crée sa propre invitation
// dans son propre agenda, comme sur Doctolib.

export interface CalendarLinkParams {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  durationHours: number;
}

function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function buildGoogleCalendarUrl(params: CalendarLinkParams): string {
  const end = new Date(
    params.startDate.getTime() + params.durationHours * 60 * 60 * 1000
  );
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    dates: `${toUtcStamp(params.startDate)}/${toUtcStamp(end)}`,
    details: params.description,
    location: params.location,
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\n/g, '\\n');
}

export function downloadIcsFile(params: CalendarLinkParams): void {
  const end = new Date(
    params.startDate.getTime() + params.durationHours * 60 * 60 * 1000
  );
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mustang Club//FR',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@mustangclub.fr`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(params.startDate)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeIcsText(params.title)}`,
    `DESCRIPTION:${escapeIcsText(params.description)}`,
    `LOCATION:${escapeIcsText(params.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${params.title}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
