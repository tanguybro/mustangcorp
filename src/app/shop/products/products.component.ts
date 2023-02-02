import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '@environments/environment';
import { Product } from '@shared/models/product';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-products',
    templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit {
    products: Product[];

    constructor(private http: HttpClient) {}

    ngOnInit(): void {
        this.getAll().subscribe((data: Product[]) => (this.products = data.sort((a, b) => a.price - b.price)));
    }

    private getAll(): Observable<Product[]> {
        return this.http.get<Product[]>(environment.apiUrl + '/products.json');
    }
}
