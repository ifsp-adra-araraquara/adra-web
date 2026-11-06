import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  it('token vencido é trocado sem sair da tela e a requisição é repetida', () => {
    const trocarPorTokenDaAplicacao = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: 'token', trocarPorTokenDaAplicacao } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    let resposta: unknown;

    TestBed.inject(HttpClient).get('/api/avisos').subscribe((corpo) => (resposta = corpo));
    http.expectOne('/api/avisos').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/avisos').flush({ ok: true });

    expect(trocarPorTokenDaAplicacao).toHaveBeenCalledWith(false);
    expect(resposta).toEqual({ ok: true });
  });
});
