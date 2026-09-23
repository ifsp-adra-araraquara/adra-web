import { StatusPresenca } from '../../enum/StatusPresenca';
import { MotivoFalta } from '../../enum/MotivoFalta';

export interface PresencaRequestDTO {
  aulaId: number;
  assistidoId: number;
  statusPresenca: StatusPresenca;
  // obrigatório apenas quando statusPresenca = FALTA_JUSTIFICADA (CA-65.2)
  motivoFalta?: MotivoFalta | null;
  // obrigatório apenas quando motivoFalta = OUTRO (CA-65.2)
  observacao?: string | null;
}
