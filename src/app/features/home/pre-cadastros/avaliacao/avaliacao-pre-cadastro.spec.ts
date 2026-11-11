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
    await new Promise((resolve) => setTimeout(resolve));
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
      { rotulo: 'Endereço', naFicha: 'Rua das Flores, 100', enviado: 'Rua das Palmeiras, 100', diferente: true },
      { rotulo: 'NIS', naFicha: '12345678901', enviado: '12345678901', diferente: false },
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
  };

  async function montar(dadosComparacao: ComparacaoRematriculaDTO): Promise<void> {
    service.buscar.mockResolvedValue({ ...detalhe, assistidoExistenteId: 42, jaMatriculadoNoAno: dadosComparacao.jaMatriculadoNoAno });
    service.comparacao.mockResolvedValue(dadosComparacao);

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
    expect(texto()).toContain('1 dado diferente da ficha');
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

    expect(service.rematricular).toHaveBeenCalledWith(5, 3);
    expect(texto()).toContain('matriculado em 2027');
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
