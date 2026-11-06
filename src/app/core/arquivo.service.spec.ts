import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { EntidadeArquivo } from '../shared/enum/EntidadeArquivo';
import { ArquivoService } from './arquivo.service';

const ehLoteDeFotos = (requisicao: { url: string }) => requisicao.url.endsWith('/api/arquivos/fotos-perfil');
const proximaTarefa = () => new Promise((resolver) => setTimeout(resolver));

describe('ArquivoService', () => {
  let arquivos: ArquivoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    arquivos = TestBed.inject(ArquivoService);
    http = TestBed.inject(HttpTestingController);
  });

  function pedirFotos(quantidade: number): Promise<(string | null)[]> {
    return Promise.all(
      Array.from({ length: quantidade }, (_, indice) => arquivos.fotoPerfilUrl(EntidadeArquivo.ASSISTIDO, indice + 1)),
    );
  }

  it('avatares da mesma tela saem em um único request', async () => {
    const urls = pedirFotos(30);
    await proximaTarefa();

    const requisicao = http.expectOne(ehLoteDeFotos);
    expect(requisicao.request.params.get('entidadeIds')?.split(',')).toHaveLength(30);
    requisicao.flush({ 1: { url: 'https://storage.test/1', expiraEm: new Date(Date.now() + 300_000).toISOString() } });

    const resultado = await urls;
    expect(resultado[0]).toBe('https://storage.test/1');
    expect(resultado[1]).toBeNull();
  });

  it('divide os pedidos em lotes de 100', async () => {
    const urls = pedirFotos(120);
    await proximaTarefa();

    const requisicoes = http.match(ehLoteDeFotos);
    expect(requisicoes).toHaveLength(2);
    requisicoes.forEach((requisicao) => requisicao.flush({}));
    await urls;
  });

  it('perfil sem acesso cai nas iniciais', async () => {
    const urls = pedirFotos(2);
    await proximaTarefa();

    http.expectOne(ehLoteDeFotos).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(await urls).toEqual([null, null]);
  });
});
