import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatriculaService } from '../../../core/matricula.service';
import { EncerramentoPreviaDTO } from '../../../shared/models/matricula/Matricula';
import { EncerramentoAno } from './encerramento-ano';

// Dados inventados.
const previa = (extra: Partial<EncerramentoPreviaDTO> = {}): EncerramentoPreviaDTO => ({
  ano: 2026,
  totalAtivas: 3,
  renovaram: 2,
  naoRenovaram: 1,
  novosNoAnoSeguinte: 4,
  quemNaoRenovou: [{ assistidoId: 7, nomeCompleto: 'Bruno Teste', nomeTurma: 'Grupo Manhã' }],
  podeEncerrar: true,
  motivoBloqueio: null,
  ...extra,
});

describe('EncerramentoAno', () => {
  let fixture: ComponentFixture<EncerramentoAno>;
  const service = { encerrar: vi.fn() };

  async function montar(dados: EncerramentoPreviaDTO): Promise<void> {
    service.encerrar.mockReset();
    await TestBed.configureTestingModule({
      imports: [EncerramentoAno],
      providers: [{ provide: MatriculaService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(EncerramentoAno);
    fixture.componentRef.setInput('previa', dados);
    fixture.detectChanges();
    botao('Encerrar 2026')!.click();
    fixture.detectChanges();
  }

  const botoes = () => [...document.querySelectorAll('button')];
  const botao = (rotulo: string) => botoes().find((b) => b.textContent?.trim() === rotulo);
  const confirmarNoModal = () => botoes().filter((b) => b.textContent?.trim() === 'Encerrar 2026').at(-1)!;

  it('mostra quem perde a vaga e só encerra depois de confirmar', async () => {
    await montar(previa());
    service.encerrar.mockResolvedValue({ ano: 2026 });
    const encerrou = vi.fn();
    fixture.componentInstance.encerrado.subscribe(encerrou);

    expect(document.body.textContent).toContain('Bruno Teste');
    expect(document.body.textContent).toContain('1 não renovou e perde a vaga');
    expect(confirmarNoModal().disabled).toBe(true);

    const caixa = document.querySelector<HTMLInputElement>('.check input')!;
    caixa.click();
    fixture.detectChanges();
    confirmarNoModal().click();
    await fixture.whenStable();

    expect(service.encerrar).toHaveBeenCalledWith(2026);
    expect(encerrou).toHaveBeenCalled();
  });

  it('avisa que o disciplinar do ano será arquivado e o que ainda está pendente', async () => {
    await montar(previa({ disciplinarArquivados: 12, disciplinarDocumentosPendentes: 2, disciplinarConsequenciasPendentes: 0 }));
    const texto = document.body.textContent ?? '';
    expect(texto).toContain('12 registros disciplinares serão arquivados');
    expect(texto).toContain('a contagem de ocorrências recomeça em 2027');
    expect(texto).toContain('2 documentos ainda sem assinatura');
    expect(texto).not.toContain('consequência');
  });

  it('bloqueado: explica o motivo e não deixa encerrar', async () => {
    await montar(previa({ podeEncerrar: false, motivoBloqueio: 'Abra a matrícula de 2027 antes de encerrar 2026.' }));

    expect(document.body.textContent).toContain('Abra a matrícula de 2027 antes de encerrar 2026.');
    expect(document.querySelector('.check input')).toBeNull();
    expect(confirmarNoModal().disabled).toBe(true);
  });
});
