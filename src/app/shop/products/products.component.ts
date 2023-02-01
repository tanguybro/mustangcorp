import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '@environments/environment';
import { Product } from '@shared/models/product';
import { SelectItem } from 'primeng/api';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-products',
    templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit {
    products: Product[];
    sortOptions: SelectItem[];
    sortOrder: number;
    sortField: string;

    constructor(private http: HttpClient) {}

    ngOnInit(): void {
        this.getAll().subscribe((data: Product[]) => (this.products = data));
        this.sortOptions = [
            { label: 'Price High to Low', value: '!price' },
            { label: 'Price Low to High', value: 'price' },
        ];
    }

    // onSortChange(event) {
    //     let value = event.value;

    //     if (value.indexOf('!') === 0) {
    //         this.sortOrder = -1;
    //         this.sortField = value.substring(1, value.length);
    //     } else {
    //         this.sortOrder = 1;
    //         this.sortField = value;
    //     }
    // }

    private getAll(): Observable<Product[]> {
        return this.http.get<Product[]>(environment.apiUrl + '/products.json');
    }
}
