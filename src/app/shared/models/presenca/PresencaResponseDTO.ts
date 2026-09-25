import { StatusPresenca } from '../../enum/StatusPresenca';
import { MotivoFalta } from '../../enum/MotivoFalta';

export interface PresencaResponseDTO {
  // null quando o status é PRESENTE inferido (modelo esparso — nunca vira
  // linha no banco, ver PresencaResponseDTO.presente() no back).
  presencaId: number | null;
  aulaId: number;
  assistidoId: number;
  nomeCompleto: string;
  statusPresenca: StatusPresenca;
  motivoFalta: MotivoFalta | null;
  observacao: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
}
