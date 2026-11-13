import { AvisoDTO } from '../models/aviso/Aviso';
import { acaoDoAviso, agruparAvisos, rotaDoAviso } from './aviso.util';

// Dados inventados.
const suspensoHoje: AvisoDTO = {
  tipo: 'SUSPENSO_HOJE',
  titulo: 'Crianca Teste',
  detalhe: 'Suspenso até amanhã',
  assistidoId: 7,
  turmaId: null,
  data: null,
};

describe('aviso.util', () => {
  it('aviso de hoje abre a ficha do atendido', () => {
    expect(rotaDoAviso(suspensoHoje)).toEqual({ comandos: ['/assistidos'], queryParams: { assistidoId: 7, aba: 'disc' } });
    expect(acaoDoAviso(suspensoHoje)).toBe('Ver ficha');
  });

  it('Educador Social (só Chamada e Calendário) vai para a chamada', () => {
    expect(rotaDoAviso(suspensoHoje, true)).toEqual({ comandos: ['/chamada'] });
    expect(acaoDoAviso(suspensoHoje, true)).toBe('Abrir chamada');
  });

  it('semanário não enviado fica no grupo Semanário e leva às oficinas', () => {
    const semanario: AvisoDTO = {
      tipo: 'SEMANARIO_PENDENTE',
      titulo: 'Futebol — semanário da semana',
      detalhe: '2 grupos sem semanário na semana de 09/11',
      assistidoId: null,
      turmaId: null,
      data: '2026-11-09',
    };
    expect(rotaDoAviso(semanario)).toEqual({ comandos: ['/oficinas'] });
    expect(acaoDoAviso(semanario)).toBe('Ver oficinas');
    expect(agruparAvisos([semanario]).map((g) => g.titulo)).toEqual(['Semanário']);
  });

  it('pedido de desligamento leva aos pedidos em Atendidos', () => {
    const pedido: AvisoDTO = {
      tipo: 'DESLIGAMENTO_SOLICITADO',
      titulo: '1 pedido(s) de desligamento aguardando',
      detalhe: 'Solicitados pela Assistente Social',
      assistidoId: null,
      turmaId: null,
      data: null,
    };
    expect(rotaDoAviso(pedido)).toEqual({ comandos: ['/assistidos'], queryParams: { desligamentos: 1 } });
    expect(acaoDoAviso(pedido)).toBe('Analisar');
  });
});
