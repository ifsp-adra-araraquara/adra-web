import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AulaService } from '../aula.service';

/**
 * FT-17: a chamada passou a ser por grupo e dia. Links antigos para
 * `/chamada/aula/:aulaId` (calendário, turmas, ficha, painel) abrem a chamada
 * do grupo da aula na data dela.
 */
export const chamadaDaAulaGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const aulaId = Number(route.paramMap.get('aulaId'));

  return inject(AulaService).buscarComDetalhes(aulaId).pipe(
    map((aula) =>
      aula.turmaId
        ? router.createUrlTree(['/chamada/grupo', aula.turmaId, aula.dataAula])
        : router.createUrlTree(['/chamada']),
    ),
    catchError(() => of(router.createUrlTree(['/chamada']))),
  );
};
