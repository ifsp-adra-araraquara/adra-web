import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SeletorAtendidos } from './seletor-atendidos';

const grupos = [
  { turmaId: 5, nomeTurma: 'Sonho Infantil A', faixaEtaria: '6 a 8 anos', ativo: true },
  { turmaId: 6, nomeTurma: 'Conexão Jovem B', faixaEtaria: '12 a 14 anos', ativo: true },
];

function pagina(nomes: string[], paginaAtual = 0, totalPaginas = 1) {
  return {
    conteudo: nomes.map((nomeCompleto, i) => ({
      assistidoId: paginaAtual * 100 + i + 1,
      nomeCompleto,
      dataNascimento: '2015-03-10',
      nomeTurma: 'Sonho Infantil A',
      totalOcorrenciasAtivas: 1,
      totalAdvertenciasAtivas: 0,
      totalSuspensoes: 0,
    })),
    pagina: paginaAtual,
    tamanho: 24,
    totalElementos: nomes.length * totalPaginas,
    totalPaginas,
  };
}

async function montar() {
  localStorage.clear();
  await TestBed.configureTestingModule({
    imports: [SeletorAtendidos],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const fixture = TestBed.createComponent(SeletorAtendidos);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((r) => r.url.endsWith('/api/turmas')).flush(grupos);
  return { fixture, http };
}

function pedidoAtendidos(http: HttpTestingController) {
  return http.expectOne((r) => r.url.endsWith('/api/assistidos'));
}

describe('SeletorAtendidos', () => {
  it('carrega os grupos e a primeira página dos ativos', async () => {
    const { fixture, http } = await montar();
    const req = pedidoAtendidos(http);
    expect(req.request.params.get('status')).toBe('ATIVO');
    expect(req.request.params.get('pagina')).toBe('0');
    req.flush(pagina(['Lucas Martins', 'Ana Clara Ribeiro']));
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Sonho Infantil A');
    expect(texto).toContain('Lucas M.');
    expect(texto).toContain('Ana Clara R.');
  });

  it('filtrar por grupo pede só os atendidos dele e lembra a escolha', async () => {
    const { fixture, http } = await montar();
    pedidoAtendidos(http).flush(pagina(['Lucas Martins']));

    fixture.componentInstance.filtrarGrupo(5);

    expect(pedidoAtendidos(http).request.params.get('turmaId')).toBe('5');
    expect(localStorage.getItem('adra.registro-rapido.grupo')).toBe('5');
  });

  it('tocar marca e desmarca, e a escolha continua ao trocar de grupo', async () => {
    const { fixture, http } = await montar();
    pedidoAtendidos(http).flush(pagina(['Lucas Martins']));
    await fixture.whenStable();
    fixture.detectChanges();

    const cartao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.cartao')!;
    cartao.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.escolhidos().map((e) => e.nomeCompleto)).toEqual(['Lucas Martins']);
    expect(cartao.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.escolhidos()[0].totalOcorrenciasAtivas).toBe(1);

    fixture.componentInstance.filtrarGrupo(6);
    pedidoAtendidos(http).flush(pagina([]));
    expect(fixture.componentInstance.escolhidos().length).toBe(1);

    fixture.componentInstance.alternar(fixture.componentInstance.escolhidos()[0]);
    expect(fixture.componentInstance.escolhidos().length).toBe(0);
  });

  it('Enter na busca marca o primeiro resultado e limpa a busca', async () => {
    const { fixture, http } = await montar();
    pedidoAtendidos(http).flush(pagina(['Lucas Martins']));
    await fixture.whenStable();
    fixture.componentInstance.termo.set('luc');

    fixture.componentInstance.escolherPrimeiro(new Event('keydown'));

    expect(fixture.componentInstance.escolhidos().map((e) => e.nomeCompleto)).toEqual(['Lucas Martins']);
    expect(fixture.componentInstance.termo()).toBe('');
    pedidoAtendidos(http).flush(pagina(['Lucas Martins']));
  });

  it('"Mostrar mais" pede a próxima página e junta na grade', async () => {
    const { fixture, http } = await montar();
    pedidoAtendidos(http).flush(pagina(['Lucas Martins'], 0, 2));
    await fixture.whenStable();

    fixture.componentInstance.carregarMais();
    const req = pedidoAtendidos(http);
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(pagina(['Pedro Henrique'], 1, 2));
    await fixture.whenStable();

    expect(fixture.componentInstance.itens().map((i) => i.nomeCompleto)).toEqual(['Lucas Martins', 'Pedro Henrique']);
    expect(fixture.componentInstance.temMais()).toBe(false);
  });
});
