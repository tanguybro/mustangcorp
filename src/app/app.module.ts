import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { SharedModule as SharedModulePrimeNg } from 'primeng/api';
import { DataViewModule } from 'primeng/dataview';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { TableModule } from 'primeng/table';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GamesListComponent } from './games/games-list/games-list.component';
import { MenuComponent } from './menu/menu.component';
import { ProductComponent } from './shop/product/product.component';
import { ProductsComponent } from './shop/products/products.component';
import { UsersListComponent } from './users/users-list/users-list.component';

@NgModule({
    declarations: [AppComponent, MenuComponent, ProductsComponent, ProductComponent, GamesListComponent, UsersListComponent],
    imports: [
        BrowserModule,
        AppRoutingModule,
        HttpClientModule,
        MenubarModule,
        MenuModule,
        SharedModulePrimeNg,
        TableModule,
        DataViewModule,
        // AuthModule.forRoot({
        //     domain: 'dev-56pvpr1t.us.auth0.com',
        //     clientId: 'i1vKQ6DF5q7RTyB1TbumFZgOtzTqN3bd',
        // }),
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
