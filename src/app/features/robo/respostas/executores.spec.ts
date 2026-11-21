/**
 * ADRAbot — roda TODAS as respostas com dados de exemplo (inventados), para
 * pegar erro de execução sem precisar da API: toda intenção responde com
 * texto, próximos passos e, quando oferece PDF, um relatório com tabela.
 */
import { Role } from '../../../shared/enum/role.enum';
import { StatusChamada } from '../../../shared/enum/StatusChamada';
import { StatusPresenca } from '../../../shared/enum/StatusPresenca';
import { RoboDados } from '../dados/robo-dados.service';
import { INTENCOES } from '../motor/catalogo';
import { periodoMes } from '../motor/periodo';
import { Entidades, Lacunas } from '../motor/tipos';
import { Contexto, executorPara, intencoesSemResposta } from './executores';
import { menuCompleto, respostaFora } from './respostas-fora';

const HOJE = new Date(2026, 10, 19);
const ENTIDADES: Entidades = {
  grupos: [{ id: 1, nome: 'Girassol', detalhe: 'Futebol' }, { id: 2, nome: 'Ipê', detalhe: 'Teatro' }],
  oficinas: [{ id: 10, nome: 'Futebol', detalhe: 'Carlos' }, { id: 11, nome: 'Teatro', detalhe: 'Bia' }],
};

const linha = (mes: string, turmaId: number, nomeTurma: string, oficinas: string, faltas: number) => ({
  mes, turmaId, nomeTurma, oficinas, chamadas: 4, esperados: 40, faltas, justificadas: 1, percentual: Math.round(((40 - faltas - 1) * 100) / 40),
});

const DADOS = {
  entidades: async () => ENTIDADES,
  limpar: () => undefined,
  frequencia: async (de: string, ate: string) => ({
    de, ate, geradoEm: '',
    linhas: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2025-11', '2025-10']
      .filter((m) => m >= de && m <= ate)
      .flatMap((m) => [linha(m, 1, 'Girassol', 'Futebol', 6), linha(m, 2, 'Ipê', 'Futebol, Teatro', 2)]),
  }),
  frequenciaPorDiaDaSemana: async (de: string, ate: string, turmaId?: number) => ({
    de, ate, turmaId: turmaId ?? null,
    dias: [
      { diaSemana: 2, chamadas: 10, esperados: 100, ausencias: 8, percentual: 92 },
      { diaSemana: 5, chamadas: 10, esperados: 100, ausencias: 25, percentual: 75 },
    ],
  }),
  faltasSeguidas: async () => ({
    limiar: 3, desde: '2026-10-05', total: 1,
    itens: [{ assistidoId: 7, nome: 'Ana Teste', turmaId: 1, turma: 'Girassol', faltas: 4, ultimaChamada: '2026-11-18' }],
  }),
  distribuicao: async (por: string) => ({ por, ativos: 50, itens: [{ rotulo: 'Centro', total: 30 }, { rotulo: 'FEMININO', total: 20 }] }),
  movimento: async (ano: number) => ({
    ano, ativosInicio: 40, ativosFim: 50, entradas: 15, saidas: 5,
    meses: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, entradas: 1, saidas: 0 })),
    motivos: [{ rotulo: 'mudou de cidade', total: 3 }],
  }),
  disciplinar: async (mes: string) => ({
    mes, ocorrencias: 3, advertencias: 1, suspensoes: 0, totalMesAnterior: 6,
    grupos: [{ turmaId: 1, nomeTurma: 'Girassol', ocorrencias: 3, advertencias: 1, suspensoes: 0, totalMesAnterior: 6 }],
  }),
  social: async () => ({
    ativos: 50, recebemPrograma: 20, programas: [{ rotulo: 'BOLSA_FAMILIA', total: 18 }], rendaInformada: 40,
    faixasRenda: [{ rotulo: 'Até R$ 1.000', total: 25 }], pcd: 2, necessidadesEspecificas: 3, problemaSaude: 4,
    comNis: 30, estudaContraturno: 45, turnoEscola: [{ rotulo: 'MANHA', total: 30 }],
  }),
  buscarAtendidos: async (nome: string) => [{ assistidoId: 7, nome: nome.includes('ana') ? 'Ana Teste' : 'Bruno Teste', grupo: 'Girassol', data: null, detalhe: null }],
  aniversariantes: async () => [{ assistidoId: 7, nome: 'Ana Teste', grupo: 'Girassol', data: '2026-11-25', detalhe: '10 anos' }],
  umPasso: async () => [{ assistidoId: 7, nome: 'Ana Teste', grupo: null, data: null, detalhe: '2 OCORRENCIA' }],
  avisos: async () => [{ tipo: 'SEMANARIO_PENDENTE', titulo: 'Semanário de Futebol', detalhe: 'Semana de 17/11', assistidoId: null, turmaId: null, data: null }],
  statusChamadas: async () => [{ turmaId: 1, nomeTurma: 'Girassol', data: '2026-11-10', status: StatusChamada.PENDENTE, lancadaPorNome: null }],
  grupos: async () => [
    { turmaId: 1, nomeTurma: 'Girassol', turno: 'MANHA', faixaEtariaId: null, faixaEtaria: '6–10 anos', capacidade: 20, ativo: true, quantidadeAlunos: 18, oficinaIds: [10] },
    { turmaId: 2, nomeTurma: 'Ipê', turno: 'TARDE', faixaEtariaId: null, faixaEtaria: null, capacidade: 15, ativo: true, quantidadeAlunos: 15, oficinaIds: [11] },
  ],
  preCadastros: async () => [{ preCadastroId: 1, nomeCompleto: 'Caio Teste', dataNascimento: null, idade: 8, responsavelNome: 'Mãe', responsavelTelefone: null, criadoEm: '2026-11-15T10:00:00', status: 'PENDENTE', cpfJaCadastrado: false, assistidoId: null }],
  desligamentos: async () => [{ solicitacaoId: 1, assistidoId: 7, nomeAtendido: 'Ana Teste', nomeTurma: 'Girassol', dataSaida: '2026-11-30', motivo: 'Mudança', status: 'PENDENTE', solicitadoPorNome: 'Assistente', criadoEm: '', resposta: null, decididoPorNome: null, decididoEm: null }],
  frequenciaDoAtendido: async () => [
    { data: '2026-11-03', turmaId: 1, nomeTurma: 'Girassol', statusPresenca: StatusPresenca.PRESENTE },
    { data: '2026-11-10', turmaId: 1, nomeTurma: 'Girassol', statusPresenca: StatusPresenca.FALTA },
    { data: '2026-11-17', turmaId: 1, nomeTurma: 'Girassol', statusPresenca: StatusPresenca.FALTA_JUSTIFICADA },
  ],
  fichaDisciplinar: async () => ({
    resumo: { ocorrenciasAtivas: 2, advertenciasAtivas: 0, suspensoesAtivas: 0, uniformeAtivas: 0, faltamParaAdvertencia: 1, faltamParaSuspensao: 3, faltamParaPerderPasseio: 0, faltamParaRetornoComResponsavel: 0, suspensoAte: null, retornoComResponsavelPendente: false, perdeProximoPasseio: false, documentosPendentes: 0 },
    registros: [{ dataRegistro: '2026-11-05', nivel: 'OCORRENCIA', motivo: 'Briga' }],
  }),
} as unknown as RoboDados;

const LACUNAS: Lacunas[] = [
  { periodos: [], comparar: false },
  { periodos: [periodoMes('2026-10')], comparar: false, grupo: ENTIDADES.grupos[0], oficina: ENTIDADES.oficinas[1], nome: 'ana', dimensao: 'BAIRRO', numero: 3 },
  { periodos: [periodoMes('2026-09'), periodoMes('2026-10')], comparar: true },
  { periodos: [periodoMes('2026-10')], comparar: true },
];

function contexto(lacunas: Lacunas, perfil = Role.COORD): Contexto {
  return { lacunas, perfil, hoje: HOJE, dados: DADOS, entidades: ENTIDADES };
}

describe('ADRAbot — respostas', () => {
  it('toda intenção de dados tem resposta', () => {
    expect(intencoesSemResposta()).toEqual([]);
  });

  it('toda intenção responde sem erro, com texto e próximo passo, em vários cenários', async () => {
    for (const intencao of INTENCOES) {
      for (const lacunas of LACUNAS) {
        const r = await executorPara(intencao)(contexto(lacunas, intencao.perfis[0]));
        expect(r.texto.length, intencao.id).toBeGreaterThan(0);
        expect(r.texto.join(' '), intencao.id).not.toMatch(/undefined|NaN|null|\[object/);
        expect(r.acoes.length + (r.menu?.length ?? 0), `${intencao.id} sem próximo passo`).toBeGreaterThan(0);
        if (r.acoes.some((a) => a.tipo === 'pdf')) {
          expect(r.relatorio, `${intencao.id} oferece PDF sem relatório`).toBeTruthy();
          for (const t of r.relatorio!.tabelas) for (const l of t.linhas) expect(l.length, intencao.id).toBe(t.colunas.length);
        }
      }
    }
  });

  it('frequência do grupo bate com a conta do critério', async () => {
    const intencao = INTENCOES.find((i) => i.id === 'freq.grupo')!;
    const r = await executorPara(intencao)(contexto({ periodos: [periodoMes('2026-10')], comparar: false, grupo: ENTIDADES.grupos[0] }));
    // 40 esperados, 6 faltas + 1 FJ → (40 − 7) ÷ 40 = 82,5% → 83%
    expect(r.texto[0]).toContain('**83%**');
  });

  it('respostas de fora do escopo sempre têm saída', () => {
    for (const categoria of ['saudacao', 'agradecimento', 'apresentacao', 'menu', 'escrita', 'dado-pessoal', 'orientacao', 'ofensa', 'alheio', 'nao-entendi'] as const) {
      for (const falhas of [0, 1]) {
        const r = respostaFora(categoria, Role.EDUCADOR, falhas);
        expect(r.acoes.length + (r.menu?.length ?? 0), categoria).toBeGreaterThan(0);
      }
    }
    expect(respostaFora('protecao', Role.EDUCADOR, 0).texto.join(' ')).toContain('Disque 100');
  });

  it('o menu de cada perfil só traz o que ele pode perguntar', () => {
    for (const perfil of [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR, Role.OFICINEIRO]) {
      const ids = menuCompleto(perfil).flatMap((g) => g.acoes).map((a) => (a.tipo === 'executar' ? a.intencaoId : ''));
      for (const id of ids) expect(INTENCOES.find((i) => i.id === id)!.perfis, `${perfil} ${id}`).toContain(perfil);
    }
  });
});
