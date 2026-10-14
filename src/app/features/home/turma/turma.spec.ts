import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Turmas } from './turma';
import { Turno } from '../../../shared/enum/Turno';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { environment } from '../../../../environments/environment';

describe('Turmas', () => {
  let component: Turmas;
  let fixture: ComponentFixture<Turmas>;
  let httpMock: HttpTestingController;

  const apiTurmas = `${environment.apiUrl}/api/turmas`;
  const apiOficinas = `${environment.apiUrl}/api/oficinas`;

  const turmaMock: TurmaResponseDTO = {
    turmaId: 1,
    nomeTurma: 'CJ Grupo A',
    turno: Turno.MANHA,
    faixaEtaria: '6-9 anos',
    capacidade: 24,
    ativo: true,
    observacoes: '',
  };

  /** ngOnInit dispara carregarTurmas() + carregarOficinas() juntos — mocka ambos. */
  function flushCargaInicial(turmas: TurmaResponseDTO[] = []): void {
    httpMock.expectOne((r) => r.url === apiTurmas).flush(turmas);
    httpMock.expectOne((r) => r.url === apiOficinas).flush([]);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Turmas, HttpClientTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Turmas);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar as turmas ao inicializar, filtrando por ativas por padrão', () => {
    fixture.detectChanges(); // dispara ngOnInit -> carregarTurmas()

    const req = httpMock.expectOne(
      (r) => r.url === apiTurmas && r.params.get('ativo') === 'true',
    );
    expect(req.request.method).toBe('GET');

    req.flush([turmaMock]);
    httpMock.expectOne((r) => r.url === apiOficinas).flush([]);

    expect(component.turmas()).toEqual([turmaMock]);
    expect(component.carregando()).toBe(false);
  });

  it('deve exibir mensagem de erro quando a listagem falhar', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === apiTurmas);
    req.flush('erro', { status: 500, statusText: 'Server Error' });
    httpMock.expectOne((r) => r.url === apiOficinas).flush([]);

    expect(component.erroListar()).toContain('Não foi possível carregar');
    expect(component.carregando()).toBe(false);
  });

  it('não deve permitir salvar turma sem nome preenchido', async () => {
    fixture.detectChanges();
    flushCargaInicial();

    component.abrirModalNovaTurma();
    component.formTurma.nomeTurma = '';

    await component.salvarTurma();

    expect(component.erroSalvar()).toBe('Informe o nome da turma.');
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('não deve permitir salvar turma sem turno selecionado', async () => {
    fixture.detectChanges();
    flushCargaInicial();

    component.abrirModalNovaTurma();
    component.formTurma.nomeTurma = 'CJ Grupo B';
    component.formTurma.turno = '';
    component.formTurma.capacidade = 20;

    await component.salvarTurma();

    expect(component.erroSalvar()).toBe('Selecione o turno.');
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('não deve permitir salvar turma com capacidade inválida', async () => {
    fixture.detectChanges();
    flushCargaInicial();

    component.abrirModalNovaTurma();
    component.formTurma.nomeTurma = 'CJ Grupo B';
    component.formTurma.turno = Turno.TARDE;
    component.formTurma.capacidade = 0;

    await component.salvarTurma();

    expect(component.erroSalvar()).toBe('Informe uma capacidade válida.');
    httpMock.expectNone((r) => r.method === 'POST');
  });
});
