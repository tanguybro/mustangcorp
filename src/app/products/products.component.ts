import { Component, OnInit } from '@angular/core';
import { PRODUCTS } from '../products';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.sass']
})
export class ProductsComponent implements OnInit {
  
  products = PRODUCTS;
  
  constructor() { }

  ngOnInit(): void {
  }

}
