import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

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
      criadoEm: null,
      atualizadoEm: null,
    },
    {
      presencaId: 99,
      aulaId: 10,
      assistidoId: 2,
      nomeCompleto: 'Ana Desligada',
      statusPresenca: StatusPresenca.FALTA,
      motivoFalta: null,
      observacao: null,
      criadoEm: '2026-09-10T10:00:00',
      atualizadoEm: '2026-09-10T10:00:00',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AulaModal, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: { currentProfile: () => Role.SOCIO } }],
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
      },
      {
        assistidoId: 1,
        nomeCompleto: 'Beto Ativo',
        statusPresenca: StatusPresenca.PRESENTE,
        motivoFalta: null,
        observacao: '',
      },
    ]);
  });
});
