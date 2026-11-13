import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitacaoDesligamentoDTO } from '../../../../shared/models/desligamento/SolicitacaoDesligamento';
import { PedidosDesligamento } from './pedidos-desligamento';

// Dados inventados.
const pedido = (status: SolicitacaoDesligamentoDTO['status'], resposta: string | null = null): SolicitacaoDesligamentoDTO => ({
  solicitacaoId: status === 'PENDENTE' ? 1 : 2,
  assistidoId: 10,
  nomeAtendido: 'Crianca Teste',
  nomeTurma: 'Grupo A',
  dataSaida: '2026-11-20',
  motivo: 'Família mudou de cidade',
  status,
  solicitadoPorNome: 'Maria Assistente',
  criadoEm: '2026-11-13T10:00:00Z',
  resposta,
  decididoPorNome: status === 'PENDENTE' ? null : 'Carlos Coordenador',
  decididoEm: status === 'PENDENTE' ? null : '2026-11-13T12:00:00Z',
});

describe('PedidosDesligamento', () => {
  let fixture: ComponentFixture<PedidosDesligamento>;

  const montar = async (pedidos: SolicitacaoDesligamentoDTO[], ehCoordenador: boolean) => {
    await TestBed.configureTestingModule({ imports: [PedidosDesligamento] }).compileComponents();
    fixture = TestBed.createComponent(PedidosDesligamento);
    fixture.componentRef.setInput('pedidos', pedidos);
    fixture.componentRef.setInput('ehCoordenador', ehCoordenador);
    fixture.detectChanges();
  };
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botao = (rotulo: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes(rotulo));

  it('sem pedidos, não mostra nada', async () => {
    await montar([], true);
    expect(texto().trim()).toBe('');
  });

  it('Coordenador aprova ou recusa; a recusa exige resposta', async () => {
    await montar([pedido('PENDENTE')], true);
    expect(texto()).toContain('1 aguardando');
    expect(texto()).toContain('Família mudou de cidade');
    const aprovados: SolicitacaoDesligamentoDTO[] = [];
    const recusados: { resposta: string }[] = [];
    fixture.componentInstance.aprovar.subscribe((p) => aprovados.push(p));
    fixture.componentInstance.recusar.subscribe((r) => recusados.push(r));

    botao('Aprovar e desligar')!.click();
    expect(aprovados.length).toBe(1);

    botao('Recusar')!.click();
    fixture.detectChanges();
    botao('Recusar pedido')!.click();
    fixture.detectChanges();
    expect(recusados.length).toBe(0);
    expect(texto()).toContain('Explique por que o pedido foi recusado');
  });

  it('Assistente Social só retira o próprio pedido e vê a resposta do que foi recusado', async () => {
    await montar([pedido('PENDENTE'), pedido('RECUSADA', 'Conversar com a família antes')], false);
    expect(botao('Aprovar e desligar')).toBeUndefined();
    expect(botao('Retirar pedido')).toBeDefined();
    expect(texto()).toContain('Recusado por Carlos Coordenador');
    expect(texto()).toContain('Conversar com a família antes');
  });
});
