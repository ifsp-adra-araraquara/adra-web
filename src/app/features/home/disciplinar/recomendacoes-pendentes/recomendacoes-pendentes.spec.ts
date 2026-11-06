import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecomendacoesPendentes } from './recomendacoes-pendentes';
import { NivelDisciplinar } from '../../../../shared/enum/NivelDisciplinar';
import { RegistroDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';

function recomendacao(registroId: number, nomeAssistido: string): RegistroDisciplinarDTO {
  return {
    registroId,
    assistidoId: registroId,
    nomeAssistido,
    motivo: 'Falar palavrão',
    nivel: NivelDisciplinar.OCORRENCIA,
    sequencia: 3,
    dataRegistro: '2026-11-01',
    consequencia: 'RECOMENDA_ADVERTENCIA',
    consequenciaPendente: true,
    arquivado: false,
  } as RegistroDisciplinarDTO;
}

const lucas = recomendacao(1, 'Lucas Martins');
const ana = recomendacao(2, 'Ana Souza');

async function montar(podeAgir: boolean): Promise<ComponentFixture<RecomendacoesPendentes>> {
  await TestBed.configureTestingModule({ imports: [RecomendacoesPendentes] }).compileComponents();
  const fixture = TestBed.createComponent(RecomendacoesPendentes);
  fixture.componentRef.setInput('registros', [lucas, ana]);
  fixture.componentRef.setInput('podeAgir', podeAgir);
  fixture.detectChanges();
  return fixture;
}

function detalhe(fixture: ComponentFixture<RecomendacoesPendentes>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.rec-detalhe')!;
}

describe('RecomendacoesPendentes', () => {
  it('mostra a primeira no detalhe e troca ao escolher outra', async () => {
    const fixture = await montar(true);
    expect(detalhe(fixture).textContent).toContain('Lucas Martins chegou a 3 ocorrências ativas');

    const botoes = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.rec-escolher');
    botoes[1].click();
    fixture.detectChanges();

    expect(detalhe(fixture).textContent).toContain('Ana Souza chegou a 3 ocorrências ativas');
  });

  it('Coordenador gera ou dispensa', async () => {
    const fixture = await montar(true);
    const gerar = vi.fn();
    const dispensar = vi.fn();
    fixture.componentInstance.gerar.subscribe(gerar);
    fixture.componentInstance.dispensar.subscribe(dispensar);

    const botoes = Array.from(detalhe(fixture).querySelectorAll('button'));
    botoes.find((b) => b.textContent?.includes('Gerar advertência'))!.click();
    botoes.find((b) => b.textContent?.includes('Dispensar'))!.click();

    expect(gerar).toHaveBeenCalledWith(lucas);
    expect(dispensar).toHaveBeenCalledWith(lucas);
  });

  it('outros perfis só veem que a coordenação vai decidir', async () => {
    const fixture = await montar(false);
    expect(detalhe(fixture).textContent).toContain('Aguardando a decisão da coordenação');
    expect(detalhe(fixture).textContent).not.toContain('Dispensar');
  });
});
