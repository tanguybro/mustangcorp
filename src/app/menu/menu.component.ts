import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
})
export class MenuComponent implements OnInit {
    items: MenuItem[];

    constructor() {}

    ngOnInit(): void {
        this.items = [
            {
                label: 'Boutique',
                icon: 'pi pi-home',
                routerLink: '/',
            },
            {
                label: 'Utilisateurs',
                icon: 'pi pi-users',
                routerLink: 'users',
            },
            {
                label: 'Jeux',
                icon: 'pi pi-game',
                routerLink: 'games',
            },
        ];
    }
}
