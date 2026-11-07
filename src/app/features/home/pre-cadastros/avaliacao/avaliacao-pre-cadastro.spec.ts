import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { PreCadastroService } from '../../../../core/pre-cadastro.service';
import { PreCadastroResponseDTO } from '../../../../shared/models/precadastro/PreCadastro';
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
  assistidoExistenteId: null,
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

  it('avisa o que a família não enviou', () => {
    expect(texto()).toContain('A família não enviou: Foto do atendido, Documento do responsável');
  });

  it('aprovar com CPF já cadastrado mostra o aviso com o link para a ficha', async () => {
    service.aprovar.mockRejectedValue(
      new HttpErrorResponse({ status: 409, error: { mensagem: 'CPF já cadastrado para o atendido X.', assistidoId: 42 } }),
    );

    botao('Aprovar e criar cadastro').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.aprovar).toHaveBeenCalledWith(5, expect.objectContaining({ cpf: '56532228281' }));
    expect(texto()).toContain('CPF já cadastrado para o atendido X.');
    expect(texto()).toContain('Abrir ficha do atendido');
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
