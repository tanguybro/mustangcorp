import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GamesListComponent } from './games/games-list/games-list.component';
import { ProductsComponent } from './shop/products/products.component';
import { UsersListComponent } from './users/users-list/users-list.component';

const routes: Routes = [
    { path: '', component: ProductsComponent },
    { path: 'users', component: UsersListComponent },
    { path: 'games', component: GamesListComponent },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
