import { Routes } from '@angular/router';
import { CalendarComponent } from './calendar/calendar.component';
import { ShopComponent } from './shop/shop.component';
import { ProfileComponent } from './profile/profile.component';
import { RankingComponent } from './ranking/ranking.component';
import { FaqComponent } from './faq/faq.component';
import { AdminComponent } from './admin/admin.component';
import { adminGuard } from './shared/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/calendar', pathMatch: 'full' },
  { path: 'calendar', component: CalendarComponent },
  { path: 'shop', component: ShopComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'ranking', component: RankingComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
];
