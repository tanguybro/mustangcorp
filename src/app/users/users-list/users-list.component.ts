import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '@environments/environment';
import { User } from '@shared/models/user';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.sass'],
})
export class UsersListComponent implements OnInit {
    users: User[];
    columns: any[];

    constructor(private http: HttpClient) {
        this.columns = [
            { field: 'name', header: 'Nom' },
            { field: 'mtc', header: 'MTC' },
            { field: 'victory', header: 'Victoires' },
        ];
    }

    ngOnInit(): void {
        this.getAll().subscribe((data: User[]) => (this.users = data.sort((a, b) => b.mtc - a.mtc)));
    }

    private getAll(): Observable<User[]> {
        return this.http.get<User[]>(environment.apiUrl + '/users.json');
    }
}
