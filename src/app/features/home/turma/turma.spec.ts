import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { Turmas } from './turma';
import { Turno } from '../../../shared/enum/Turno';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { environment } from '../../../../environments/environment';

describe('Turmas', () => {
  let component: Turmas;
  let fixture: ComponentFixture<Turmas>;
  let httpMock: HttpTestingController;

  const apiTurmas = `${environment.apiUrl}/api/turmas`;

  const turmaMock: TurmaResponseDTO = {
    turmaId: 1,
    nomeTurma: 'CJ Grupo A',
    turno: Turno.MANHA,
    faixaEtaria: '6-9 anos',
    capacidade: 24,
    ativo: true,
    observacoes: '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Turmas, HttpClientTestingModule],
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

    expect(component.turmas()).toEqual([turmaMock]);
    expect(component.carregando()).toBe(false);
  });

  it('deve exibir mensagem de erro quando a listagem falhar', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === apiTurmas);
    req.flush('erro', { status: 500, statusText: 'Server Error' });

    expect(component.erroListar()).toContain('Não foi possível carregar');
    expect(component.carregando()).toBe(false);
  });

  it('não deve permitir salvar turma sem nome preenchido', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === apiTurmas).flush([]);

    component.abrirModalNovaTurma();
    component.formTurma.nomeTurma = '';

    await component.salvarTurma();

    expect(component.erroSalvar()).toBe('Informe o nome da turma.');
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('não deve permitir salvar turma sem turno selecionado', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === apiTurmas).flush([]);

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
    httpMock.expectOne((r) => r.url === apiTurmas).flush([]);

    component.abrirModalNovaTurma();
    component.formTurma.nomeTurma = 'CJ Grupo B';
    component.formTurma.turno = Turno.TARDE;
    component.formTurma.capacidade = 0;

    await component.salvarTurma();

    expect(component.erroSalvar()).toBe('Informe uma capacidade válida.');
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('deve enviar POST ao criar uma turma válida', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === apiTurmas).flush([]);

    component.abrirModalNovaTurma();
    component.formTurma = {
      nomeTurma: 'CJ Grupo B',
      turno: Turno.TARDE,
      faixaEtaria: '10-13 anos',
      capacidade: 20,
      observacoes: '',
    };

    const salvarPromise = component.salvarTurma();

    const reqPost = httpMock.expectOne((r) => r.url === apiTurmas && r.method === 'POST');
    reqPost.flush({ ...turmaMock, turmaId: 2, nomeTurma: 'CJ Grupo B' });

    // recarrega a lista após salvar
    httpMock.expectOne((r) => r.url === apiTurmas).flush([]);

    await salvarPromise;

    expect(component.mostrarModalForm()).toBe(false);
    expect(component.erroSalvar()).toBeNull();
  });

  it('deve enviar PUT ao editar uma turma existente', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === apiTurmas).flush([turmaMock]);

    component.abrirModalEditarTurma(turmaMock);
    component.formTurma.capacidade = 30;

    const salvarPromise = component.salvarTurma();

    const reqPut = httpMock.expectOne(
      (r) => r.url === `${apiTurmas}/${turmaMock.turmaId}` && r.method === 'PUT',
    );
    reqPut.flush({ ...turmaMock, capacidade: 30 });

    httpMock.expectOne((r) => r.url === apiTurmas).flush([]);

    await salvarPromise;

    expect(component.mostrarModalForm()).toBe(false);
  });

  it('deve enviar PATCH de status ao confirmar inativação', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === apiTurmas).flush([turmaMock]);

    component.abrirModalStatus(turmaMock);
    expect(component.mostrarModalStatus()).toBe(true);

    const confirmarPromise = component.confirmarAlteracaoStatus();

    const reqPatch = httpMock.expectOne(
      (r) => r.url === `${apiTurmas}/${turmaMock.turmaId}/status` && r.method === 'PATCH',
    );
    expect(reqPatch.request.body).toEqual({ ativo: false });
    reqPatch.flush({ ...turmaMock, ativo: false });

    httpMock.expectOne((r) => r.url === apiTurmas).flush([]);

    await confirmarPromise;

    expect(component.mostrarModalStatus()).toBe(false);
  });

  it('deve reenviar filtro de turno como query param ao trocar o filtro', () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === apiTurmas).flush([]);

    component.onFiltroTurnoChange(Turno.INTEGRAL);

    const req = httpMock.expectOne(
      (r) => r.url === apiTurmas && r.params.get('turno') === Turno.INTEGRAL,
    );
    req.flush([]);
  });
});