import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Rotas publicas: nao precisam (e nao devem) receber o token de quem estiver
// logado no navegador nesse momento. Ex: alguem clicando num link de convite
// enquanto um admin esta logado no mesmo navegador nao pode ter a chamada
// autenticada como o admin -- se o token do admin estiver vencido/invalido,
// o Spring Security rejeita a requisicao com 401 mesmo o endpoint sendo
// permitAll, e o interceptor entao desloga o admin e manda pro /login.
const ROTAS_PUBLICAS = ['/api/auth/login', '/api/convite'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const ehRotaPublica = ROTAS_PUBLICAS.some(rota => req.url.includes(rota));
  if (ehRotaPublica) {
    return next(req);
  }

  return next(comToken(req, auth.token)).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status !== 401) {
        return throwError(() => erro);
      }
      // Token da aplicacao venceu antes do Supabase avisar: troca e repete uma vez.
      return auth.trocarPorTokenDaAplicacao().pipe(
        switchMap(() => next(comToken(req, auth.token))),
        catchError(() => {
          auth.logout();
          return throwError(() => erro);
        })
      );
    })
  );
};

function comToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}