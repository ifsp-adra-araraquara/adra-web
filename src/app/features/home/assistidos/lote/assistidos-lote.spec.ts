import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AssistidosLote } from './assistidos-lote';
import { environment } from '../../../../../environments/environment';
import { ResultadoLinhaLoteDTO } from '../../../../shared/models/assistido/ResultadoLinhaLoteDTO';

describe('AssistidosLote', () => {
  let component: AssistidosLote;
  let fixture: ComponentFixture<AssistidosLote>;
  let httpMock: HttpTestingController;
  const api = `${environment.apiUrl}/api/assistidos`;

  beforeEach(async () => {
    URL.createObjectURL = () => 'blob:teste';
    URL.revokeObjectURL = () => undefined;

    await TestBed.configureTestingModule({
      imports: [AssistidosLote],
      providers: [provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AssistidosLote);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  /** CPF do assistido é obrigatório: cada irmão com o seu (válidos, de teste). */
  const CPF_IRMAO: Record<string, string> = { 'Ana Souza': '22233344405', 'Bruno Souza': '33344455508' };

  function adicionarIrmao(nomeCompleto: string): void {
    component.adicionarLinha({
      nomeCompleto,
      dataNascimento: '10/03/2015',
      cpf: CPF_IRMAO[nomeCompleto],
      responsaveis: [
        {
          nomeCompleto: 'Maria Souza',
          cpf: '52998224725',
          parentesco: 'Mãe',
          telefone: '16999990001',
          email: '',
          contatoEmergencia: true,
          autorizadoRetirada: true,
        },
      ],
    });
  }

  function valida(indice: number): ResultadoLinhaLoteDTO {
    return { indice, status: 'VALIDA', erros: [], responsaveisExistentes: {} };
  }

  it('sem documento a linha fica pendente mesmo com a API aprovando', () => {
    adicionarIrmao('Ana Souza');

    component.validar();
    httpMock.expectOne(`${api}/lote/validar`).flush([valida(0)]);

    const [linha] = component.linhas();
    expect(linha.resultado()?.status).toBe('INVALIDA');
    expect(component.errosGerais(linha)).toEqual(['Adicione a foto do RG ou CPF do assistido.']);
  });

  it('cadastra uma linha por vez com documento e foto opcional, e mantém na grade a que falhou', async () => {
    adicionarIrmao('Ana Souza');
    adicionarIrmao('Bruno Souza');
    const [ana, bruno] = component.linhas();
    component.trocarFoto(ana, new File(['foto'], 'foto.webp', { type: 'image/webp' }));
    for (const linha of [ana, bruno]) {
      component.trocarDocumentos(linha, [new File(['rg'], 'rg.jpg', { type: 'image/jpeg' })]);
    }

    component.validar();
    httpMock.expectOne(`${api}/lote/validar`).flush([valida(0), valida(1)]);
    expect(component.todasProntas()).toBe(true);

    const cadastro = component.cadastrar();

    const primeira = httpMock.expectOne(api);
    const corpo = primeira.request.body as FormData;
    expect(JSON.parse(await (corpo.get('dados') as Blob).text())).toMatchObject({
      nomeCompleto: 'Ana Souza',
      dataNascimento: '2015-03-10',
    });
    expect(corpo.get('foto')).toBeInstanceOf(File);
    expect(corpo.getAll('documentos')).toHaveLength(1);
    httpMock.expectNone(api);
    primeira.flush({ assistidoId: 1 });
    await fixture.whenStable();

    const segunda = httpMock.expectOne(api);
    expect((segunda.request.body as FormData).has('foto')).toBe(false);
    segunda.flush({ mensagem: 'Possível duplicidade.' }, { status: 409, statusText: 'Conflict' });
    await cadastro;

    const [restante] = component.linhas();
    expect(component.linhas()).toHaveLength(1);
    expect(restante.form.controls.nomeCompleto.value).toBe('Bruno Souza');
    expect(restante.resultado()?.status).toBe('INVALIDA');
    expect(component.errosGerais(restante)).toEqual(['Possível duplicidade.']);
    httpMock.verify();
  });
});
