export interface OficineiroTurmaDTO {
  turmaId: number;
  nomeTurma: string;
  oficinaId: number | null;
  nomeOficina: string | null;
  turno: string;
  quantidadeAlunos: number;
  capacidade: number;
}