import { Component, Input, OnInit } from '@angular/core';
import { Product } from '@shared/models/product';

@Component({
    selector: 'app-product',
    templateUrl: './product.component.html',
    styleUrls: ['./product.component.sass'],
})
export class ProductComponent implements OnInit {
    @Input() product: Product | undefined;

    constructor() {}

    ngOnInit(): void {}
}
