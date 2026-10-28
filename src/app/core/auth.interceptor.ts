import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const ROTAS_PUBLICAS = ['/api/auth/login'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Pré-cadastro: só o POST em si é público; /pendentes, /descartar e /converter são da equipe.
  const ehPreCadastroPublico = req.method === 'POST' && /\/api\/pre-cadastro$/.test(req.url);
  const ehRotaPublica = ehPreCadastroPublico || ROTAS_PUBLICAS.some(rota => req.url.includes(rota));
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