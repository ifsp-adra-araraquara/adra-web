import { AvisoDTO } from '../models/aviso/Aviso';
import { acaoDoAviso, rotaDoAviso } from './aviso.util';

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
});
