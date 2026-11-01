import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZerarContagemModal } from './zerar-contagem-modal';
import { DisciplinarService } from '../../../../core/disciplinar.service';
import { FichaDisciplinarDTO, ResumoDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';

const resumo: ResumoDisciplinarDTO = {
  ocorrenciasAtivas: 4,
  advertenciasAtivas: 1,
  suspensoesAtivas: 0,
  uniformeAtivas: 0,
  faltamParaAdvertencia: 2,
  faltamParaSuspensao: 2,
  faltamParaPerderPasseio: 3,
  faltamParaRetornoComResponsavel: 3,
  suspensoAte: null,
  retornoComResponsavelPendente: false,
  perdeProximoPasseio: false,
  documentosPendentes: 1,
};

describe('ZerarContagemModal', () => {
  let fixture: ComponentFixture<ZerarContagemModal>;
  let component: ZerarContagemModal;
  const zerarContagem = vi.fn();

  beforeEach(async () => {
    zerarContagem.mockReset();
    zerarContagem.mockResolvedValue({ resumo, registros: [] } satisfies FichaDisciplinarDTO);

    await TestBed.configureTestingModule({
      imports: [ZerarContagemModal],
      providers: [{ provide: DisciplinarService, useValue: { zerarContagem } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ZerarContagemModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('assistidoId', 7);
    fixture.componentRef.setInput('nome', 'Lucas Martins');
    fixture.componentRef.setInput('resumo', resumo);
    component.open.set(true);
    await fixture.whenStable();
  });

  it('mostra o que será arquivado e só oferece os níveis com registro ativo', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Zerar contagem disciplinar de Lucas Martins');
    expect(texto).toContain('4 ocorrências e 1 advertência');
    expect(component.opcoes().map((o) => o.rotulo)).toEqual(['Tudo', 'Ocorrências', 'Advertências']);
  });

  it('só libera com motivo e ciência', () => {
    expect(component.podeZerar()).toBe(false);
    component.motivo.set('   ');
    component.ciente.set(true);
    expect(component.podeZerar()).toBe(false);
    component.motivo.set('Início do ano letivo');
    expect(component.podeZerar()).toBe(true);
    component.ciente.set(false);
    expect(component.podeZerar()).toBe(false);
  });

  it('"Tudo" envia sem nível e fecha ao zerar', async () => {
    component.motivo.set(' Início do ano letivo ');
    component.ciente.set(true);
    await component.zerar();

    expect(zerarContagem).toHaveBeenCalledWith(7, { motivo: 'Início do ano letivo', nivel: null });
    expect(component.open()).toBe(false);
  });
});
