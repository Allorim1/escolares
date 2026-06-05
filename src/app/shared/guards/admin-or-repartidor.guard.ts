import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../data-access/auth.service';

export const adminOrRepartidorGuard: CanActivateFn = async () => {
   const authService = inject(AuthService);
   const router = inject(Router);

   const user = authService.user();
   
   const hasAccess = user && (user.isAdmin || user.rol === 'owner' || user.rol === 'root' || user.rol === 'admin' || user.rol === 'repartidor');
   
   if (!hasAccess) {
     router.navigate(['/login']);
     return false;
   }

   return true;
};