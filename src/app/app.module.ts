import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AuthModule } from '@auth0/auth0-angular';
import { AuthButtonComponent } from '@shared/auth-button/auth-button.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { ProductComponent } from './product/product.component';
import { ProductsComponent } from './products/products.component';

@NgModule({
    declarations: [AppComponent, ProductsComponent, NavbarComponent, ProductComponent, AuthButtonComponent],
    imports: [
        BrowserModule,
        AppRoutingModule,
        AuthModule.forRoot({
            domain: 'dev-56pvpr1t.us.auth0.com',
            clientId: 'i1vKQ6DF5q7RTyB1TbumFZgOtzTqN3bd',
        }),
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
