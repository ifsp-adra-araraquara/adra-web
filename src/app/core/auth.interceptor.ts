import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const ROTA_LOGIN = '/api/auth/login';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // O login ja manda o token do Supabase; nao pode ser reenviado nem repetido.
  if (req.url.includes(ROTA_LOGIN)) {
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
