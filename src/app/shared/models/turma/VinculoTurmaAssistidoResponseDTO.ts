import { StatusGeral } from '../../enum/StatusGeral';
import { Turno } from '../../enum/Turno';

/**
 * Histórico de vínculos do assistido com turmas (tabela turma_aluno) — aba
 * "Turmas" do modal do assistido, GET /api/assistidos/{id}/turmas, só pro
 * coordenador.
 */
export interface VinculoTurmaAssistidoResponseDTO {
  turmaId: number;
  nomeTurma: string;
  turno: Turno;
  turmaAtiva: boolean;
  dataEntrada: string;
  dataSaida: string | null;
  status: StatusGeral;
}
