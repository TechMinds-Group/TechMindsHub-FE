import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getMe().pipe(
    map(user => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }
      return true;
    }),
    catchError(() => {
      return of(router.createUrlTree(['/login']));
    })
  );
};
