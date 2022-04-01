import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { USERS } from '../users';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.sass']
})
export class NavbarComponent implements OnInit {

  balance: number = 0;

  constructor(public auth: AuthService) {

  }

  ngOnInit(): void {
    this.auth.user$.subscribe(user => {
      if(user?.email !== undefined) {
        let balance = USERS.get(user.email);
        if(balance !== undefined) {
          this.balance = balance;
        }
      }
    });
  }

}
