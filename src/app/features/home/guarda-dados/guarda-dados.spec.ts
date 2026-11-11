import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GuardaDadosService } from '../../../core/guarda-dados.service';
import { PreviaDescarteDTO } from '../../../shared/models/guarda/GuardaDados';
import { GuardaDados } from './guarda-dados';

// Dados inventados.
const previa = (extra: Partial<PreviaDescarteDTO> = {}): PreviaDescarteDTO => ({
  limite: '2021-11-11',
  matriculas: 2,
  anos: [2020],
  atendidosRemovidos: 1,
  quemSaiPorInteiro: [{ assistidoId: 7, nomeCompleto: 'Ana Antiga', ultimoAno: 2020 }],
  responsaveis: 1,
  preCadastros: 1,
  registrosDisciplinares: 0,
  arquivos: 3,
  bytes: 3 * 1024 * 1024,
  ...extra,
});

describe('GuardaDados', () => {
  let fixture: ComponentFixture<GuardaDados>;
  const service = { previa: vi.fn(), descartes: vi.fn(), descartar: vi.fn(), orfaos: vi.fn(), removerOrfaos: vi.fn() };

  async function montar(dados: PreviaDescarteDTO): Promise<void> {
    Object.values(service).forEach((fn) => fn.mockReset());
    service.previa.mockResolvedValue(dados);
    service.descartes.mockResolvedValue([]);
    await TestBed.configureTestingModule({
      imports: [GuardaDados],
      providers: [provideRouter([]), { provide: GuardaDadosService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(GuardaDados);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botao = (rotulo: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes(rotulo))!;

  it('mostra o que sai, oferece a lista do ano e só descarta depois de confirmar', async () => {
    await montar(previa());
    service.descartar.mockResolvedValue({ matriculas: 2, atendidos: 1, arquivos: 3 });

    expect(texto()).toContain('Ana Antiga');
    expect(texto()).toContain('Lista de 2020');
    expect(botao('Descartar dados fora do prazo').disabled).toBe(true);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.check input')!.click();
    fixture.detectChanges();
    botao('Descartar dados fora do prazo').click();
    await fixture.whenStable();

    expect(service.descartar).toHaveBeenCalled();
  });

  it('sem nada fora do prazo, não oferece descarte', async () => {
    await montar(previa({ matriculas: 0, preCadastros: 0, anos: [], quemSaiPorInteiro: [], atendidosRemovidos: 0 }));

    expect(texto()).toContain('Nada passou do prazo de guarda');
    expect(botao('Descartar dados fora do prazo')).toBeUndefined();
  });
});
