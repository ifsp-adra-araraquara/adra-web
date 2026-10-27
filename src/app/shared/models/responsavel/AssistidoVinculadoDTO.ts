import { StatusGeral } from '../../enum/StatusGeral';

/** Assistido ligado a um responsável — GET /api/responsaveis/{id}/assistidos. */
export interface AssistidoVinculadoDTO {
  assistidoId: number;
  nomeCompleto: string;
  status: StatusGeral;
  nomeTurma: string | null;
  parentesco: string | null;
  responsavelPrincipal: boolean;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
}
