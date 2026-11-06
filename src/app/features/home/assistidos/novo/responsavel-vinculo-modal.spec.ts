import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ResponsavelVinculoModal } from './responsavel-vinculo-modal';
import { ResponsavelPendente } from '../assistido-form.util';
import { environment } from '../../../../../environments/environment';
import { ResponsavelResponseDTO } from '../../../../shared/models/responsavel/ResponsavelResponseDTO';

const CPF_ANA = '52998224725';

function cadastrado(responsavelId: number, nomeCompleto: string, cpf: string | null): ResponsavelResponseDTO {
  return { responsavelId, nomeCompleto, cpf, totalAssistidos: 1 } as ResponsavelResponseDTO;
}

describe('ResponsavelVinculoModal', () => {
  let component: ResponsavelVinculoModal;
  let fixture: ComponentFixture<ResponsavelVinculoModal>;
  let httpMock: HttpTestingController;
  let confirmados: ResponsavelPendente[];

  async function abrir(cadastrados: ResponsavelResponseDTO[]): Promise<void> {
    component.open.set(true);
    await fixture.whenStable();
    httpMock.expectOne(`${environment.apiUrl}/api/responsaveis`).flush(cadastrados);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponsavelVinculoModal],
      providers: [provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ResponsavelVinculoModal);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    confirmados = [];
    component.confirmado.subscribe((responsavel) => confirmados.push(responsavel));
  });

  it('acha pelo nome sem acento, mostra homônimos, esconde quem já está na lista e vincula pelo id', async () => {
    fixture.componentRef.setInput('usados', [{ responsavelId: 3, cpf: '' }]);
    await abrir([
      cadastrado(1, 'Maria da Conceição', null),
      cadastrado(2, 'Maria da Conceição', null),
      cadastrado(3, 'Maria da Conceição', null),
      cadastrado(4, 'Ana Souza', CPF_ANA),
    ]);

    component.termo.set('conceicao');
    expect(component.resultados().map((r) => r.responsavelId)).toEqual([1, 2]);

    component.selecionar(component.resultados()[1]);
    component.confirmar();

    expect(confirmados[0].responsavelId).toBe(2);
    expect(confirmados[0].cpf).toBe('');
  });

  it('cadastra novo sem CPF aproveitando o nome digitado', async () => {
    await abrir([]);

    component.termo.set('João Novo');
    component.cadastrarNovo();
    component.confirmar();

    expect(component.etapa()).toBe('novo');
    expect(confirmados[0].nomeCompleto).toBe('João Novo');
    expect(confirmados[0].responsavelId).toBeUndefined();
  });

  it('CPF de quem já tem cadastro leva ao vínculo em vez de cadastrar de novo', async () => {
    await abrir([cadastrado(4, 'Ana Souza', CPF_ANA)]);

    component.termo.set(CPF_ANA);
    component.cadastrarNovo();
    component.atualizar('nomeCompleto', 'Ana Digitada');
    component.confirmar();

    expect(component.etapa()).toBe('existente');
    expect(component.form().responsavelId).toBe(4);
    expect(confirmados).toEqual([]);
  });
});
