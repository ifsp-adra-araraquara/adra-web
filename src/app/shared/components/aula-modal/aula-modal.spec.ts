import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AulaModal } from './aula-modal';
import { AuthService } from '../../../core/auth.service';
import { Role } from '../../enum/role.enum';
import { StatusAula } from '../../enum/StatusAula';
import { StatusPresenca } from '../../enum/StatusPresenca';
import { AulaComDetalhesResponseDTO } from '../../models/aula/AulaComDetalhesResponseDTO';
import { PresencaResponseDTO } from '../../models/presenca/PresencaResponseDTO';
import { environment } from '../../../../environments/environment';
import { hojeISO } from '../../utils/aula.util';

/**
 * CA-70.1/CA-70.2 + CA-66.1: a lista de alunos da chamada precisa vir só de
 * GET /api/chamadas/aula/{id} (fonte única, já filtrada/data-aware no back)
 * — sem esse teste, um retorno futuro pra buscar /api/assistidos passaria
 * batido no build (TypeScript não pega regressão de "fonte errada").
 */
describe('AulaModal', () => {
  let component: AulaModal;
  let fixture: ComponentFixture<AulaModal>;
  let httpMock: HttpTestingController;

  const aulaMock: AulaComDetalhesResponseDTO = {
    aulaId: 10,
    turmaId: 1,
    nomeTurma: 'CJ Grupo A',
    nomeOficineiro: 'Fulano',
    quantidadeAlunos: 2,
    titulo: 'Aula de hoje',
    descricao: null,
    dataAula: hojeISO(),
    horarioInicio: '08:00',
    horarioFim: '09:00',
    conteudoPrevisto: null,
    conteudoMinistrado: null,
    objetivos: null,
    recursosNecessarios: null,
    statusAula: StatusAula.PLANEJADA,
    observacoes: null,
    criadoEm: '',
    atualizadoEm: '',
  };

  const presencasMock: PresencaResponseDTO[] = [
    {
      presencaId: null,
      aulaId: 10,
      assistidoId: 1,
      nomeCompleto: 'Beto Ativo',
      statusPresenca: StatusPresenca.PRESENTE,
      motivoFalta: null,
      observacao: null,
      criadoPorId: null,
      criadoPorNome: null,
      atualizadoPorId: null,
      atualizadoPorNome: null,
      criadoEm: null,
      atualizadoEm: null,
      historicoRecente: [],
    },
    {
      presencaId: 99,
      aulaId: 10,
      assistidoId: 2,
      nomeCompleto: 'Ana Desligada',
      statusPresenca: StatusPresenca.FALTA,
      motivoFalta: null,
      observacao: null,
      criadoPorId: 5,
      criadoPorNome: 'Coordenador Silva',
      atualizadoPorId: 5,
      atualizadoPorNome: 'Coordenador Silva',
      criadoEm: '2026-09-10T10:00:00',
      atualizadoEm: '2026-09-10T10:00:00',
      historicoRecente: [
        { dataAula: '2026-09-08', statusPresenca: StatusPresenca.FALTA },
        { dataAula: '2026-09-03', statusPresenca: StatusPresenca.FALTA },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AulaModal, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: { currentProfile: () => Role.SOCIO } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AulaModal);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('monta a lista de alunos só com GET /api/chamadas/aula/{id} (nomeCompleto incluso), sem chamar /api/assistidos', async () => {
    component.aula = aulaMock;
    component.ngOnChanges({ aula: {} as any });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/chamadas/aula/${aulaMock.aulaId}`);
    expect(req.request.method).toBe('GET');
    req.flush(presencasMock);
    await fixture.whenStable();

    httpMock.expectNone((r) => r.url.includes('/api/assistidos'));

    expect(component.alunos()).toEqual([
      {
        assistidoId: 2,
        nomeCompleto: 'Ana Desligada',
        statusPresenca: StatusPresenca.FALTA,
        motivoFalta: null,
        observacao: '',
        criadoPorId: 5,
        criadoPorNome: 'Coordenador Silva',
        atualizadoPorId: 5,
        atualizadoPorNome: 'Coordenador Silva',
        criadoEm: '2026-09-10T10:00:00',
        atualizadoEm: '2026-09-10T10:00:00',
        historicoRecente: [
          { dataAula: '2026-09-08', statusPresenca: StatusPresenca.FALTA },
          { dataAula: '2026-09-03', statusPresenca: StatusPresenca.FALTA },
        ],
      },
      {
        assistidoId: 1,
        nomeCompleto: 'Beto Ativo',
        statusPresenca: StatusPresenca.PRESENTE,
        motivoFalta: null,
        observacao: '',
        criadoPorId: null,
        criadoPorNome: null,
        atualizadoPorId: null,
        atualizadoPorNome: null,
        criadoEm: null,
        atualizadoEm: null,
        historicoRecente: [],
      },
    ]);
  });
});

/**
 * US-67 (CA-67.1/CA-67.2/CA-67.3): coordenador corrige chamada de qualquer
 * data; sociopedagógico só a do dia atual — a tela precisa bloquear
 * visualmente a edição antes mesmo de chamar a API. A validação que vale de
 * verdade é sempre a do backend (PresencaService); isso aqui é só a UX.
 */
describe('AulaModal — US-67 correção de chamada por perfil e data', () => {
  const aulaSemanaPassadaMock: AulaComDetalhesResponseDTO = {
    aulaId: 20,
    turmaId: 1,
    nomeTurma: 'CJ Grupo A',
    nomeOficineiro: 'Fulano',
    quantidadeAlunos: 1,
    titulo: 'Aula de uma semana atrás',
    descricao: null,
    dataAula: '2020-01-01',
    horarioInicio: '08:00',
    horarioFim: '09:00',
    conteudoPrevisto: null,
    conteudoMinistrado: null,
    objetivos: null,
    recursosNecessarios: null,
    statusAula: StatusAula.REALIZADA,
    observacoes: null,
    criadoEm: '',
    atualizadoEm: '',
  };

  async function montarComponente(perfil: Role): Promise<{ component: AulaModal; httpMock: HttpTestingController }> {
    await TestBed.configureTestingModule({
      imports: [AulaModal, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: { currentProfile: () => perfil } },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AulaModal);
    const component = fixture.componentInstance;
    const httpMock = TestBed.inject(HttpTestingController);

    component.aula = aulaSemanaPassadaMock;
    component.ngOnChanges({ aula: {} as any });
    httpMock.expectOne(`${environment.apiUrl}/api/chamadas/aula/${aulaSemanaPassadaMock.aulaId}`).flush([]);
    await fixture.whenStable();

    return { component, httpMock };
  }

  it('CA-67.1: coordenador vê a chamada (travada, com opção de alterar) mesmo numa aula de uma semana atrás', async () => {
    const { component, httpMock } = await montarComponente(Role.COORD);

    expect(component.mostrarAvisoForaDoDia()).toBe(false);
    expect(component.mostrarAvisoChamadaFeita()).toBe(true); // já finalizada -> precisa clicar em "Alterar chamada"

    component.desbloquearEdicao();
    expect(component.mostrarFormularioChamada()).toBe(true);

    httpMock.verify();
  });

  it('CA-67.2/CA-67.3: sociopedagógico é bloqueado visualmente numa aula de uma semana atrás, sem chegar a chamar a API de correção', async () => {
    const { component, httpMock } = await montarComponente(Role.SOCIO);

    expect(component.mostrarAvisoForaDoDia()).toBe(true);
    expect(component.mostrarFormularioChamada()).toBe(false);
    expect(component.mostrarAvisoChamadaFeita()).toBe(false);

    httpMock.verify();
  });
});
