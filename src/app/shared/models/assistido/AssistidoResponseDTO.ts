import { StatusGeral } from '../../enum/StatusGeral'

export interface AssistidoResponseDTO {
  assistidoId: number;
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string | null;
  dataEntrada: string | null;
  dataSaida: string | null;
  motivoSaida: string | null;
  necessidadesEspecificas: string | null;
  observacoes: string | null;
  status: StatusGeral;
  totalOcorrenciasAtivas: number;
  totalAdvertenciasAtivas: number;
  totalSuspensoes: number;
  criadoEm: string;
  atualizadoEm: string;
}