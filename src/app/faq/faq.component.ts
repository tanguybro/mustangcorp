import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css'],
})
export class FaqComponent {
  faqList: FaqItem[] = [
    {
      question: "C'est quoi Mustang Club ?",
      answer:
        "C'est un club de jeux créé par Tanguy Brouassin. Le but est de réunir des personnes autour de différents formats de jeux.",
    },
    {
      question: 'Comment je m\'inscris à un jeu ?',
      answer:
        "L'inscription se paie avec votre solde en euro. Rechargez-le depuis la Boutique via PayPal ou Lydia (le crédit est ajouté manuellement dès réception du paiement), puis inscrivez-vous depuis le Calendrier.",
    },
    {
      question: "C'est quoi les MTC ?",
      answer:
        "Ce sont les jetons du club, utilisables uniquement dans la Boutique pour obtenir des récompenses. On les gagne en participant aux jeux (voir le tableau ci-dessous), ils ne s'achètent pas directement.",
    },
    {
      question: 'Quels sont les différents formats de jeux ?',
      answer: `• Soirée jeux grand public (1 jeudi soir sur 2) : 1 € / 1 point / +10 MTC
    • Après-midi jeux experts (1 fois par mois, le week-end) : 2 € / 2 points / +20 MTC
    • Soirée jeux vidéos (1 soir par mois, le week-end) : 2 € / 2 points / +20 MTC
    • Jeux créations (2 à 3 par an) : 5 € / gain de points modulable
    • Tournoi Mustang Sport (annuel, par équipe) : 3 € / 3 points / +30 MTC`,
    },
    {
      question: 'Comment fonctionne le classement ?',
      answer:
        'Chaque jeu offre des points de saison. À la fin de la saison, le podium accède à des récompenses. Le 1er gagne un accès à tous les événements de la saison prochaine gratuitement. Les 2e et 3e gagnent respectivement 100 et 30 MTC.',
    },
  ];
}
