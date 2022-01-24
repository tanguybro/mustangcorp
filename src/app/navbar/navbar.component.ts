import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';

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
    this.balance = 0;
  }

}
