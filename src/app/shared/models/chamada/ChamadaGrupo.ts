import { StatusChamada } from '../../enum/StatusChamada';
import { StatusPresenca } from '../../enum/StatusPresenca';
import { MotivoFalta } from '../../enum/MotivoFalta';
import { Turno } from '../../enum/Turno';
import { AutorizadoRetiradaDTO } from '../presenca/PresencaResponseDTO';

/** GET /api/chamadas/dia — em feriado ou exceção, `grupos` vem vazio e `motivoSemChamada` diz o porquê. */
export interface ChamadasDoDiaDTO {
  data: string;
  motivoSemChamada: string | null;
  grupos: GrupoDoDiaDTO[];
}

export interface GrupoDoDiaDTO {
  turmaId: number;
  nomeTurma: string;
  turno: Turno | null;
  totalAtendidos: number;
  status: StatusChamada;
  lancadaPorNome: string | null;
  lancadaEm: string | null;
}

/** GET e PUT /api/chamadas/turma/{id}/dia/{data}. */
export interface ChamadaGrupoDTO {
  turmaId: number;
  nomeTurma: string;
  data: string;
  lancada: boolean;
  podeEditar: boolean;
  lancadaPorNome: string | null;
  lancadaEm: string | null;
  atualizadaPorNome: string | null;
  atualizadaEm: string | null;
  atendidos: AtendidoChamadaDTO[];
}

export interface AtendidoChamadaDTO {
  assistidoId: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  podeIrEmboraSozinho: boolean;
  statusPresenca: StatusPresenca;
  motivoFalta: MotivoFalta | null;
  observacao: string | null;
  /** Últimas chamadas do grupo, a mais recente primeiro. */
  historicoRecente: { data: string; statusPresenca: StatusPresenca }[];
  frequenciaPercentual: number | null;
  autorizadosRetirada: AutorizadoRetiradaDTO[];
}

/** GET /api/chamadas/status — situação de cada grupo em cada dia do período. */
export interface StatusChamadaDiaDTO {
  turmaId: number;
  nomeTurma: string;
  data: string;
  status: StatusChamada;
  lancadaPorNome: string | null;
}

export interface PresencaChamadaRequestDTO {
  assistidoId: number;
  statusPresenca: StatusPresenca;
  motivoFalta: MotivoFalta | null;
  observacao: string | null;
}
