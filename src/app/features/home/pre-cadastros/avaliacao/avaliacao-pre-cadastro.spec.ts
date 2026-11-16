import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { PreCadastroService } from '../../../../core/pre-cadastro.service';
import { PreCadastroResponseDTO } from '../../../../shared/models/precadastro/PreCadastro';
import { ComparacaoRematriculaDTO } from '../../../../shared/models/matricula/Matricula';
import { AvaliacaoPreCadastro } from './avaliacao-pre-cadastro';

// Dados inventados.
const detalhe = {
  preCadastroId: 5,
  nomeCompleto: 'Crianca Teste',
  dataNascimento: '2016-04-12',
  cpf: '56532228281',
  sexo: null,
  email: null,
  responsavelNome: 'Mae Teste',
  responsavelTelefone: '16991234567',
  dados: {},
  status: 'PENDENTE',
  motivoReprovacao: null,
  observacao: null,
  assistidoId: null,
  anoReferencia: 2027,
  assistidoExistenteId: null,
  jaMatriculadoNoAno: false,
  arquivos: [],
  anexosFaltando: ['Foto do atendido', 'Documento do responsável'],
  revisadoPorNome: null,
  revisadoEm: null,
  criadoEm: '2026-11-01T10:00:00Z',
} as PreCadastroResponseDTO;

const responsavel = {
  nomeCompleto: 'Mae Teste',
  cpf: '96234168493',
  parentesco: 'Mãe',
  responsavelPrincipal: true,
  contatoEmergencia: false,
  autorizadoRetirada: false,
};

/** Responde o GET da ficha do atendido 42 (a tela pede depois da comparação). */
async function responderFicha(ficha: object): Promise<void> {
  const http = TestBed.inject(HttpTestingController);
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    await new Promise((resolve) => setTimeout(resolve));
    const pedidos = http.match((req) => req.url.endsWith('/api/assistidos/42'));
    if (pedidos.length) {
      pedidos.forEach((req) => req.flush(ficha));
      return;
    }
  }
  throw new Error('a tela não pediu a ficha do atendido');
}

describe('AvaliacaoPreCadastro', () => {
  let fixture: ComponentFixture<AvaliacaoPreCadastro>;
  const service = {
    buscar: vi.fn(),
    rascunhoAssistido: vi.fn(),
    aprovar: vi.fn(),
    reprovar: vi.fn(),
    colocarNaListaEspera: vi.fn(),
    salvarObservacao: vi.fn(),
    comparacao: vi.fn(),
    rematricular: vi.fn(),
    moverParaAno: vi.fn(),
  };

  beforeEach(async () => {
    Object.values(service).forEach((fn) => fn.mockReset());
    service.buscar.mockResolvedValue(detalhe);
    service.rascunhoAssistido.mockResolvedValue({
      nomeCompleto: 'Crianca Teste',
      dataNascimento: '2016-04-12',
      cpf: '56532228281',
      responsaveis: [responsavel],
    });

    await TestBed.configureTestingModule({
      imports: [AvaliacaoPreCadastro],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PreCadastroService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AvaliacaoPreCadastro);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.inject(HttpTestingController).expectOne((req) => req.url.endsWith('/api/turmas')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botao = (rotulo: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes(rotulo))!;

  it('"Matrícula do próximo ano" muda o ano sem aprovar e deixa voltar', async () => {
    const proximo = new Date().getFullYear() + 1;
    const componente = fixture.componentInstance as unknown as { detalhe: { set(d: PreCadastroResponseDTO): void } };
    componente.detalhe.set({ ...detalhe, anoReferencia: proximo - 1, anoParaMover: proximo });
    fixture.detectChanges();
    service.moverParaAno.mockResolvedValue({ ...detalhe, anoReferencia: proximo, anoParaMover: proximo - 1 });

    botao(`Matrícula do próximo ano (${proximo})`).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.moverParaAno).toHaveBeenCalledWith(5, proximo);
    expect(texto()).toContain(`Inscrição movida para as matrículas de ${proximo}`);
    expect(botao(`Voltar para ${proximo - 1}`)).toBeDefined();
    expect(botao('Aprovar e criar cadastro')).toBeDefined();
    expect(service.aprovar).not.toHaveBeenCalled();
  });

  it('avisa quando pode ser rematrícula de ficha sem CPF', () => {
    const componente = fixture.componentInstance as unknown as { detalhe: { set(d: PreCadastroResponseDTO): void } };
    componente.detalhe.set({
      ...detalhe,
      possivelMesmoAtendido: { assistidoId: 42, nomeCompleto: 'Crianca Ficha Antiga', fichaSemCpf: true },
    });
    fixture.detectChanges();

    expect(texto()).toContain('Pode ser rematrícula');
    expect(texto()).toContain('Crianca Ficha Antiga');
    expect(texto()).toContain('complete o CPF na ficha');
  });

  it('avisa o que a família não enviou', () => {
    expect(texto()).toContain('A família não enviou: Foto do atendido, Documento do responsável');
  });

  it('aprovar com CPF que acabou de ser cadastrado vira rematrícula', async () => {
    service.aprovar.mockRejectedValue(
      new HttpErrorResponse({ status: 409, error: { mensagem: 'CPF já cadastrado para o atendido X.', assistidoId: 42 } }),
    );
    service.comparacao.mockResolvedValue(comparacao());

    botao('Aprovar e criar cadastro').click();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.inject(HttpTestingController).expectOne((req) => req.url.endsWith('/api/turmas')).flush([]);
    await responderFicha({ assistidoId: 42, nomeCompleto: 'Crianca Teste', cpf: '56532228281' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.aprovar).toHaveBeenCalledWith(5, expect.objectContaining({ cpf: '56532228281' }));
    expect(texto()).toContain('CPF já cadastrado para o atendido X.');
    expect(texto()).toContain('Rematrícula em 2027');
    expect(botao('Aprovar e criar cadastro')).toBeUndefined();
  });

  it('coloca na lista de espera levando a observação digitada', async () => {
    const componente = fixture.componentInstance as unknown as { alterarObservacao(valor: string): void };
    service.colocarNaListaEspera.mockResolvedValue({ ...detalhe, status: 'LISTA_ESPERA', observacao: 'Ligar de manhã' });

    componente.alterarObservacao('Ligar de manhã');
    botao('Colocar na lista de espera').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.colocarNaListaEspera).toHaveBeenCalledWith(5, 'Ligar de manhã');
    expect(botao('Colocar na lista de espera')).toBeUndefined();
    expect(botao('Aprovar e criar cadastro')).toBeDefined();
  });

  it('aprovar acrescenta a observação da equipe às observações do atendido', async () => {
    const componente = fixture.componentInstance as unknown as { alterarObservacao(valor: string): void };
    service.aprovar.mockResolvedValue({ ...detalhe, status: 'CONVERTIDO' });

    componente.alterarObservacao('Família atendeu');
    botao('Aprovar e criar cadastro').click();
    await fixture.whenStable();

    expect(service.aprovar).toHaveBeenCalledWith(5, expect.objectContaining({ observacoes: 'Família atendeu' }));
  });

  it('reprovar sem motivo é bloqueado na tela', async () => {
    botao('Reprovar').click();
    fixture.detectChanges();
    const confirmar = [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Reprovar').at(-1)!;
    confirmar.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.reprovar).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Informe o motivo da reprovação.');
  });
});

// Dados inventados.
function comparacao(extra: Partial<ComparacaoRematriculaDTO> = {}): ComparacaoRematriculaDTO {
  return {
    assistidoId: 42,
    nomeAssistido: 'Crianca Teste',
    statusAssistido: 'ATIVO',
    ano: 2027,
    jaMatriculadoNoAno: false,
    turmaAtualId: 3,
    nomeTurmaAtual: 'Grupo Manhã',
    campos: [
      { rotulo: 'Endereço', naFicha: 'Rua das Flores, 100', enviado: 'Rua das Palmeiras, 100', diferente: true, chave: 'endereco' },
      { rotulo: 'NIS', naFicha: '12345678901', enviado: '12345678901', diferente: false, chave: 'nis' },
      { rotulo: 'Mãe', naFicha: 'Mae Teste — (16) 99123-4567', enviado: 'Mae Teste — (16) 99000-0000', diferente: true, chave: null },
    ],
    ...extra,
  };
}

describe('AvaliacaoPreCadastro — rematrícula', () => {
  let fixture: ComponentFixture<AvaliacaoPreCadastro>;
  const service = {
    buscar: vi.fn(),
    comparacao: vi.fn(),
    rematricular: vi.fn(),
    colocarNaListaEspera: vi.fn(),
    rascunhoAssistido: vi.fn(),
  };

  // Ficha de hoje e o que a família enviou agora (dados inventados).
  const fichaAtual = {
    assistidoId: 42,
    nomeCompleto: 'Crianca Teste',
    dataNascimento: '2016-04-12',
    cpf: '56532228281',
    dataEntrada: '2026-02-01',
    turmaId: 3,
    observacoes: 'Busca: avó',
    endereco: { logradouro: 'Rua das Flores', numero: '100', bairro: 'Centro', pontoReferencia: null },
    nis: '12345678901',
  };
  const enviadoAgora = {
    nomeCompleto: 'Crianca Teste',
    dataNascimento: '2016-04-12',
    cpf: '56532228281',
    dataEntrada: '2027-01-01',
    observacoes: 'Busca: avó',
    endereco: { logradouro: 'Rua das Palmeiras', numero: '100', bairro: 'Centro', pontoReferencia: null },
    nis: '12345678901',
    responsaveis: [responsavel],
  };

  async function montar(dadosComparacao: ComparacaoRematriculaDTO): Promise<void> {
    service.buscar.mockResolvedValue({ ...detalhe, assistidoExistenteId: 42, jaMatriculadoNoAno: dadosComparacao.jaMatriculadoNoAno });
    service.comparacao.mockResolvedValue(dadosComparacao);
    service.rascunhoAssistido.mockResolvedValue(enviadoAgora);

    await TestBed.configureTestingModule({
      imports: [AvaliacaoPreCadastro],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PreCadastroService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AvaliacaoPreCadastro);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/api/turmas'))
      .flush([
        { turmaId: 3, nomeTurma: 'Grupo Manhã', ativo: true },
        { turmaId: 4, nomeTurma: 'Grupo Tarde', ativo: true },
      ]);
    await responderFicha(fichaAtual);
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => Object.values(service).forEach((fn) => fn.mockReset()));

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botao = (rotulo: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes(rotulo));

  it('mostra só o que mudou e não oferece criar outro cadastro', async () => {
    await montar(comparacao());

    expect(texto()).toContain('Rematrícula em 2027');
    expect(texto()).toContain('2 dados diferentes da ficha');
    expect(texto()).toContain('Rua das Palmeiras, 100');
    expect(texto()).not.toContain('12345678901');
    expect(botao('Aprovar e criar cadastro')).toBeUndefined();

    botao('Mostrar também os 1 dados iguais')!.click();
    fixture.detectChanges();
    expect(texto()).toContain('12345678901');
  });

  it('rematricula no grupo de agora, sugerido por padrão', async () => {
    await montar(comparacao());
    service.rematricular.mockResolvedValue({ ...detalhe, status: 'CONVERTIDO', assistidoId: 42 });

    botao('Rematricular em 2027')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.rematricular).toHaveBeenCalledWith(5, 3, null);
    expect(texto()).toContain('matriculado em 2027');
  });

  it('marcar um dado leva o enviado para a ficha; desmarcar volta ao que estava', async () => {
    await montar(comparacao());
    const caixa = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('td.levar input[type=checkbox]')!;
    expect(texto()).toContain('Ficha do atendido');
    expect(texto()).toContain('Na aba Família');

    caixa().click();
    fixture.detectChanges();
    expect(texto()).toContain('A ficha será atualizada ao rematricular.');

    caixa().click();
    fixture.detectChanges();
    expect(texto()).not.toContain('A ficha será atualizada ao rematricular.');

    caixa().click();
    fixture.detectChanges();
    service.rematricular.mockResolvedValue({ ...detalhe, status: 'CONVERTIDO', assistidoId: 42 });
    botao('Rematricular em 2027')!.click();
    await fixture.whenStable();

    const ficha = service.rematricular.mock.calls[0][2];
    expect(ficha.endereco.logradouro).toBe('Rua das Palmeiras');
    expect(ficha.dataEntrada).toBe('2026-02-01');
    expect(ficha.observacoes).toBe('Busca: avó');
  });

  it('a equipe corrige um texto da ficha e ele vai junto na rematrícula', async () => {
    await montar(comparacao());
    const componente = fixture.componentInstance as unknown as { atualizar(campo: string, valor: unknown): void };
    componente.atualizar('nomeCompleto', 'Criança Teste');
    fixture.detectChanges();
    service.rematricular.mockResolvedValue({ ...detalhe, status: 'CONVERTIDO', assistidoId: 42 });

    botao('Rematricular em 2027')!.click();
    await fixture.whenStable();

    expect(service.rematricular).toHaveBeenCalledWith(5, 3, expect.objectContaining({ nomeCompleto: 'Criança Teste' }));
  });

  it('sem grupo escolhido não rematricula', async () => {
    await montar(comparacao({ turmaAtualId: null, nomeTurmaAtual: null }));

    botao('Rematricular em 2027')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.rematricular).not.toHaveBeenCalled();
    expect(texto()).toContain('Escolha o grupo do atendido no novo ano.');
  });

  it('já matriculado no ano: avisa e não oferece rematricular de novo', async () => {
    await montar(comparacao({ jaMatriculadoNoAno: true }));

    expect(texto()).toContain('já está matriculado(a) em 2027');
    expect(botao('Rematricular em 2027')).toBeUndefined();
    expect(botao('Reprovar')).toBeDefined();
  });
});
