import { PROGRAMA_TRANSFERENCIA_LABELS, ProgramaTransferencia } from '../../../shared/enum/ProgramaTransferencia';
import { PreCadastroResumoDTO } from '../../../shared/models/precadastro/PreCadastro';
import { alternarProgramas, atendeFiltros, FiltrosTriagem, haQuantoTempo, programasMarcados } from './pre-cadastros';

const item = (dados: Partial<PreCadastroResumoDTO>) =>
  ({
    rendaFamiliar: 1200,
    possuiProblemaSaude: false,
    programasTransferencia: [],
    vistoAssistenteSocial: true,
    ...dados,
  }) as PreCadastroResumoDTO;

const filtros = (dados: Partial<FiltrosTriagem>): FiltrosTriagem => ({
  rendaAte: null,
  programas: [],
  comProblemaSaude: false,
  somenteNaoVistas: false,
  ...dados,
});

describe('filtros da triagem', () => {
  it('renda: corta quem passa do limite e mantém quem não informou', () => {
    expect(atendeFiltros(item({ rendaFamiliar: 1500 }), filtros({ rendaAte: 1500 }))).toBe(true);
    expect(atendeFiltros(item({ rendaFamiliar: 1500.01 }), filtros({ rendaAte: 1500 }))).toBe(
      false,
    );
    expect(atendeFiltros(item({ rendaFamiliar: null }), filtros({ rendaAte: 1500 }))).toBe(true);
  });

  it('saúde: só passa quem tem problema, e sem resposta não passa', () => {
    expect(
      atendeFiltros(item({ possuiProblemaSaude: true }), filtros({ comProblemaSaude: true })),
    ).toBe(true);
    expect(
      atendeFiltros(item({ possuiProblemaSaude: false }), filtros({ comProblemaSaude: true })),
    ).toBe(false);
    expect(
      atendeFiltros(item({ possuiProblemaSaude: null }), filtros({ comProblemaSaude: true })),
    ).toBe(false);
  });

  it('programas: passa quem recebe qualquer um dos marcados', () => {
    const comBpc = item({ programasTransferencia: [ProgramaTransferencia.BPC] });
    const semPrograma = item({ programasTransferencia: [] });
    const bpcOuPeti = filtros({ programas: [ProgramaTransferencia.BPC, ProgramaTransferencia.PETI] });

    expect(atendeFiltros(comBpc, bpcOuPeti)).toBe(true);
    expect(atendeFiltros(semPrograma, bpcOuPeti)).toBe(false);
    expect(atendeFiltros(comBpc, filtros({ programas: [ProgramaTransferencia.PETI] }))).toBe(false);
  });

  it('não vistas: esconde as já abertas pela Assistente Social', () => {
    expect(atendeFiltros(item({ vistoAssistenteSocial: false }), filtros({ somenteNaoVistas: true }))).toBe(true);
    expect(atendeFiltros(item({ vistoAssistenteSocial: true }), filtros({ somenteNaoVistas: true }))).toBe(false);
  });
});

describe('recebe qualquer programa', () => {
  const todos = Object.keys(PROGRAMA_TRANSFERENCIA_LABELS) as ProgramaTransferencia[];

  it('marca e desmarca todos os programas', () => {
    expect(alternarProgramas([], ['QUALQUER_PROGRAMA'])).toEqual(todos);
    expect(alternarProgramas(todos, todos)).toEqual([]);
  });

  it('aparece marcado só com todos os programas marcados', () => {
    expect(programasMarcados(todos)).toContain('QUALQUER_PROGRAMA');
    const semBpc = alternarProgramas(todos, programasMarcados(todos).filter((v) => v !== ProgramaTransferencia.BPC));
    expect(semBpc).not.toContain(ProgramaTransferencia.BPC);
    expect(programasMarcados(semBpc)).not.toContain('QUALQUER_PROGRAMA');
  });
});

describe('tempo de espera', () => {
  it('conta dias do calendário, não blocos de 24 horas', () => {
    const agora = new Date(2026, 10, 7, 18, 0);
    expect(haQuantoTempo(new Date(2026, 10, 7, 8, 0).toISOString(), agora)).toBe('hoje');
    expect(haQuantoTempo(new Date(2026, 10, 6, 23, 30).toISOString(), agora)).toBe('ontem');
    expect(haQuantoTempo(new Date(2026, 10, 5, 21, 0).toISOString(), agora)).toBe('há 2 dias');
  });
});
