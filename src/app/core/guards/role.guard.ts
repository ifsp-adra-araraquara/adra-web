import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { Role } from '../../shared/enum/role.enum';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const rolesPermitidas = route.data['roles'] as Role[] | undefined;
  const perfilAtual = auth.currentProfile();

  if (!rolesPermitidas || !perfilAtual || !rolesPermitidas.includes(perfilAtual)) {
    return router.parseUrl('/acesso-negado');
  }
  return true;
};