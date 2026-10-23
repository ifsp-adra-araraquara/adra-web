import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { Assistidos } from './assistidos';
import { environment } from '../../../../environments/environment';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { VinculoFamiliarResponseDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarResponseDTO';
import { Escolaridade } from '../../../shared/enum/Escolaridade';

describe('Assistidos', () => {
  let component: Assistidos;
  let fixture: ComponentFixture<Assistidos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Assistidos],
      providers: [
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Assistidos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ao editar responsável pela ficha, preserva os dados fora do form e salva o vínculo', async () => {
    const httpMock = TestBed.inject(HttpTestingController);
    const api = environment.apiUrl;
    const vinculo: VinculoFamiliarResponseDTO = {
      assistidoId: 7,
      responsavelId: 3,
      nomeResponsavel: 'Maria Souza',
      dataNascimentoResponsavel: '1985-04-10',
      cpfResponsavel: '10433218100',
      telefoneResponsavel: '16999990001',
      emailResponsavel: 'maria@email.com',
      enderecoResponsavel: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', pontoReferencia: null },
      escolaridadeResponsavel: Escolaridade.MEDIO_COMPLETO,
      estadoCivilResponsavel: null,
      profissaoResponsavel: 'Diarista',
      rendaResponsavel: 1500,
      parentesco: 'Mãe',
      responsavelPrincipal: true,
      contatoEmergencia: true,
      autorizadoRetirada: true,
      observacoes: 'Busca às sextas',
      criadoEm: '2026-01-01T00:00:00',
    };
    component.assistidoSelecionado.set({ assistidoId: 7 } as AssistidoResponseDTO);
    component.abrirEdicaoResponsavel(vinculo);
    component.atualizarCampoEdicaoResponsavel('telefone', '16988887777');
    component.formEdicaoResponsavel = { ...component.formEdicaoResponsavel, renda: 1800 };

    const salvando = component.salvarEdicaoResponsavel();

    httpMock.expectOne(`${api}/api/responsaveis/3`).flush({
      responsavelId: 3,
      nomeCompleto: 'Maria Souza',
      dataNascimento: '1985-04-10',
      cpf: '10433218100',
      telefone: '16999990001',
      email: 'maria@email.com',
      endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', pontoReferencia: null },
      observacoes: null,
    });
    await Promise.resolve();
    const putResponsavel = httpMock.expectOne({ method: 'PUT', url: `${api}/api/responsaveis/3` });
    expect(putResponsavel.request.body).toMatchObject({
      telefone: '16988887777',
      dataNascimento: '1985-04-10',
      endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', pontoReferencia: null },
      escolaridade: Escolaridade.MEDIO_COMPLETO,
      profissao: 'Diarista',
      renda: 1800,
    });
    putResponsavel.flush({});
    await Promise.resolve();
    const putVinculo = httpMock.expectOne({ method: 'PUT', url: `${api}/api/assistidos/7/responsaveis/3` });
    expect(putVinculo.request.body).toMatchObject({ responsavelId: 3, parentesco: 'Mãe', observacoes: 'Busca às sextas' });
    putVinculo.flush({});
    await salvando;

    expect(component.responsavelEmEdicao()).toBeNull();
  });
});
