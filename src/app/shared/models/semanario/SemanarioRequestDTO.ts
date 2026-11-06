/** POST /api/semanarios — qualquer dia da semana serve, o back grava a segunda-feira dela. */
export interface SemanarioRequestDTO {
  oficinaId: number;
  turmaId: number;
  /** "2026-11-02" */
  semana: string;
  conteudoPrevisto: string;
  objetivos: string;
  recursosNecessarios: string;
}
