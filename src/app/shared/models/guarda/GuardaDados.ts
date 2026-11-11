export interface AtendidoRemovidoDTO {
  assistidoId: number;
  nomeCompleto: string;
  ultimoAno: number | null;
}

/** O que sai no descarte pelo prazo de guarda (5 anos por matrícula), antes de confirmar. */
export interface PreviaDescarteDTO {
  /** Matrículas criadas antes deste dia já passaram dos 5 anos. */
  limite: string;
  matriculas: number;
  anos: number[];
  atendidosRemovidos: number;
  quemSaiPorInteiro: AtendidoRemovidoDTO[];
  responsaveis: number;
  preCadastros: number;
  registrosDisciplinares: number;
  arquivos: number;
  bytes: number;
}

export interface DescarteDTO {
  descarteId: number;
  executadoEm: string;
  executadoPorNome: string | null;
  limite: string;
  matriculas: number;
  atendidos: number;
  responsaveis: number;
  preCadastros: number;
  arquivos: number;
  bytesLiberados: number;
}

/** Arquivos no armazenamento sem dono no sistema. */
export interface OrfaosDTO {
  arquivos: number;
  bytes: number;
  naFilaDeRemocao: number;
}
