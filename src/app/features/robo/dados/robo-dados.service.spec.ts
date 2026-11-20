import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RoboDados } from './robo-dados.service';

/** A fila solta o próximo pedido num microtask: espera ele sair antes de conferir. */
const esperarFila = () => new Promise((resolver) => setTimeout(resolver));

describe('RoboDados — cache e fila do ADRAbot', () => {
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
    await esperarFila();
    http.expectOne((r) => r.url.endsWith('/api/robo/frequencia')).flush({ de: '2026-10', ate: '2026-10', geradoEm: '', linhas: [] });
    expect(await a).toEqual(await b);
    await dados.frequencia('2026-10', '2026-10');
    await esperarFila();
    http.expectNone((r) => r.url.endsWith('/api/robo/frequencia'));
  });

  it('uma requisição por vez: a segunda só sai quando a primeira termina', async () => {
    const primeira = dados.social();
    const segunda = dados.umPasso();
    await esperarFila();
    const pedido = http.expectOne((r) => r.url.endsWith('/api/robo/social/resumo'));
    http.expectNone((r) => r.url.endsWith('/api/robo/disciplinar/um-passo'));

    pedido.flush({ ativos: 1 });
    await primeira;
    await esperarFila();
    http.expectOne((r) => r.url.endsWith('/api/robo/disciplinar/um-passo')).flush([]);
    expect(await segunda).toEqual([]);
  });

  it('erro não trava a fila, não fica guardado, e "limpar" busca de novo', async () => {
    const falha = dados.social();
    await esperarFila();
    http.expectOne((r) => r.url.endsWith('/api/robo/social/resumo')).flush('x', { status: 503, statusText: 'Ocupado' });
    await expect(falha).rejects.toBeTruthy();

    const ok = dados.social();
    await esperarFila();
    http.expectOne((r) => r.url.endsWith('/api/robo/social/resumo')).flush({ ativos: 1 });
    expect(await ok).toEqual({ ativos: 1 });

    dados.limpar();
    void dados.social();
    await esperarFila();
    http.expectOne((r) => r.url.endsWith('/api/robo/social/resumo')).flush({ ativos: 2 });
  });
});
