import { Component, OnInit } from '@angular/core';
import { PRODUCTS } from '../products';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.sass']
})
export class ProductsComponent implements OnInit {
  
  products = PRODUCTS;
  
  constructor(public auth: AuthService) { }

  ngOnInit(): void {
  }

}
