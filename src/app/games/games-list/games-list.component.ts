import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-games-list',
    templateUrl: './games-list.component.html',
    styleUrls: ['./games-list.component.sass'],
})
export class GamesListComponent implements OnInit {
    games: any[];
    columns: any[];

    constructor() {
        this.columns = [
            { field: 'game', header: 'Jeu' },
            { field: 'date', header: 'Date' },
            { field: 'winner', header: 'Gagnant(s)' },
        ];
    }

    ngOnInit(): void {
        this.games = [
            {
                game: 'Mustang Casino Night',
                date: '28/01/2023',
                winner: 'Jules',
            },
            {
                game: 'Mustang Debate',
                date: '18/06/2022',
                winner: 'Inès',
            },
            {
                game: 'MBGC',
                date: '02/04/2022',
                winner: 'Clement, Noah, Louise',
            },
            {
                game: 'Khaptaland 1 : Mystère à Khaptaland',
                date: 'Janvier 2021',
                winner: 'Léa G',
            },
            {
                game: 'Khaptaland 2 : Enchères à Khaptaland',
                date: 'Mars 2021',
                winner: 'Abel, Antoine, Clément, Eilynn, Eloise, Léa, Victor',
            },
            {
                game: 'Khaptaland 3 : Pirates à Khaptaland',
                date: 'Octobre 2021',
                winner: 'Abel, Joanna, Momo, Juliette',
            },
            {
                game: 'Khaptaland 4 : Guerre à Khaptaland',
                date: 'Septembre 2022',
                winner: 'Abel, Clement',
            },
            {
                game: 'Escape game',
                date: '22/08/2020',
                winner: 'Susie, Julien, Momo, Antoine',
            },
            {
                game: 'Tournoi échecs',
                date: '01/11/2021',
                winner: 'Romain',
            },
            {
                game: 'Tournoi basket',
                date: '25/10/2020',
                winner: 'Lea R, Abel, Tanguy',
            },
            {
                game: 'Tournoi Yu-Gi-Oh 1',
                date: '20/10/2018',
                winner: 'Julien',
            },
            {
                game: 'Tournoi Yu-Gi-Oh 2',
                date: '27/07/2019',
                winner: 'Tanguy',
            },
        ];
    }
}
