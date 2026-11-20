import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RoboDados } from './robo-dados.service';

describe('RoboDados — cache do ADRAbot', () => {
  let dados: RoboDados;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    dados = TestBed.inject(RoboDados);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('a mesma pergunta não bate na API duas vezes', async () => {
    const a = dados.frequencia('2026-10', '2026-10');
    const b = dados.frequencia('2026-10', '2026-10');
    http.expectOne((r) => r.url.endsWith('/api/robo/frequencia')).flush({ de: '2026-10', ate: '2026-10', geradoEm: '', linhas: [] });
    expect(await a).toEqual(await b);
    await dados.frequencia('2026-10', '2026-10');
    http.expectNone((r) => r.url.endsWith('/api/robo/frequencia'));
  });

  it('erro não fica guardado e "limpar" busca de novo', async () => {
    const falha = dados.social();
    http.expectOne((r) => r.url.endsWith('/api/robo/social/resumo')).flush('x', { status: 500, statusText: 'Erro' });
    await expect(falha).rejects.toBeTruthy();
    const ok = dados.social();
    http.expectOne((r) => r.url.endsWith('/api/robo/social/resumo')).flush({ ativos: 1 });
    expect(await ok).toEqual({ ativos: 1 });
    dados.limpar();
    void dados.social();
    http.expectOne((r) => r.url.endsWith('/api/robo/social/resumo')).flush({ ativos: 2 });
  });
});
