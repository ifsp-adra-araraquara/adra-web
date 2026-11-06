import { PendenciasDisciplinaresDTO } from '../disciplinar/Disciplinar';

/** FT-05 — GET /api/painel/mensal?mes=yyyy-MM. Tudo já agregado no back. */
export interface PainelMensalDTO {
  mes: string;
  geradoEm: string;
  assistidos: { ativos: number; ativosMesAnterior: number; entradas: number; saidas: number };
  oficinas: { ativas: number; novas: number };
  frequencia: {
    percentual: number | null;
    percentualMesAnterior: number | null;
    chamadasLancadas: number;
    chamadasPendentes: number;
    faltas: number;
    faltasJustificadas: number;
  };
  ocupacao: { turmasAtivas: number; alunos: number; vagas: number; percentual: number | null };
  disciplina: {
    ocorrencias: number;
    advertencias: number;
    suspensoes: number;
    uniforme: number;
    totalMesAnterior: number;
  };
  /** 6 meses, do mais antigo ao escolhido. */
  tendencia: { mes: string; percentual: number | null; chamadas: number }[];
  /** Turmas ativas, da menor para a maior frequência. */
  turmas: {
    turmaId: number;
    nomeTurma: string;
    nomeOficina: string | null;
    alunos: number;
    capacidade: number | null;
    chamadasLancadas: number;
    chamadasPendentes: number;
    frequencia: number | null;
  }[];
  faixasEtarias: { rotulo: string; total: number }[];
}

export interface ListaPainel<T> {
  itens: T[];
  total: number;
}

/** FT-05 — GET /api/painel/hoje. Independe do mês escolhido. */
export interface PainelHojeDTO {
  hoje: string;
  faltasSeguidas: ListaPainel<{ assistidoId: number; nome: string; turma: string | null; faltas: number; ultimaChamada: string }>;
  chamadasPendentes: ListaPainel<{ turmaId: number; data: string; turma: string | null }>;
  disciplina: PendenciasDisciplinaresDTO;
  umPassoDaProgressao: ListaPainel<{ assistidoId: number; nome: string; nivel: string; registros: number }>;
  aniversariantes: { assistidoId: number; nome: string; turma: string | null; dia: string; idade: number }[];
  atividades: AtividadePainel[];
}

/** Acontecimento recente — CHAMADA (referenciaId = grupo), DISCIPLINAR (= registro) ou ASSISTIDO. */
export interface AtividadePainel {
  tipo: 'CHAMADA' | 'DISCIPLINAR' | 'ASSISTIDO';
  referenciaId: number;
  assistidoId: number | null;
  /** Turma (chamada) ou nome do assistido. */
  titulo: string;
  /** Data da chamada (yyyy-MM-dd) ou nível disciplinar. */
  detalhe: string | null;
  quando: string | null;
}
