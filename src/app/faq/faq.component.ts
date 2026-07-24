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
      question: "C'est quoi les MTC ?",
      answer:
        "Ce sont les jetons du club. Ils servent à s'inscrire aux événements et à profiter de la boutique. Tu peux en acheter ou en gagner à travers les jeux.",
    },
    {
      question: 'Quels sont les différents types de jeux ?',
      answer: `Il y a 3 formats :
    
    • Soirée jeux (hebdo ou presque) : L'inscription coûte 5 MTC. Rapporte 1 point de saison.
    • Tournois (4 ou 5 par saison) : L'inscription coûte 10 MTC. Rapporte 3 points pour le 1er (et 1 point pour le 2ème si tournoi individuel).
    • Jeux Mustang (2 ou 3 par saison) : L'inscription coûte 20 MTC. Rapporte 5 points si en équipe (sinon les points sont répartis différemment).
    
    Chaque jeu redistribue 50% des MTC payés par les joueurs aux gagnants.`,
    },
    {
      question: 'Comment fonctionne le classement ?',
      answer:
        'Chaque jeu offre des points de saison aux gagnants. À la fin de la saison, le podium accède à des récompenses. Le 1er gagne un accès à tous les événements de la saison prochaine gratuitement. Les 2e et 3e gagnent respectivement 100 et 30 MTC.',
    },
  ];
}
