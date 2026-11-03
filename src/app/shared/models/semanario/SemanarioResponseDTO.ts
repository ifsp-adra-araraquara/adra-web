export interface SemanarioResponseDTO {
  semanarioId: number;
  oficinaId: number;
  nomeOficina: string;
  turmaId: number;
  nomeTurma: string;
  /** Segunda-feira da semana, "2026-11-02". */
  semanaInicio: string;
  conteudoPrevisto: string;
  objetivos: string | null;
  recursosNecessarios: string | null;
  nomeEnviadoPor: string;
  atualizadoEm: string;
}
