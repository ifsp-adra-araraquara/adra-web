import { StatusGeral } from '../../enum/StatusGeral';
import { Sexo } from '../../enum/Sexo';
import { ProgramaTransferencia } from '../../enum/ProgramaTransferencia';
import { Turno } from '../../enum/Turno';
import { EnderecoDTO } from '../endereco/EnderecoDTO';

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
  sexo?: Sexo | null;
  possuiProblemaSaude?: boolean | null;
  problemaSaude?: string | null;
  pcd?: boolean | null;
  deficiencia?: string | null;
  escolaNome?: string | null;
  escolaAnoSerie?: string | null;
  escolaTurno?: Turno | null;
  estudaContraturno?: boolean | null;
  endereco?: EnderecoDTO | null;
  rendaFamiliar?: number | null;
  recebeProgramaTransferencia?: boolean | null;
  programasTransferencia?: ProgramaTransferencia[];
  programaTransferenciaOutro?: string | null;
  nis?: string | null;
  aceiteLgpd?: boolean;
  aceiteLgpdEm?: string | null;
  autorizaUsoImagem?: boolean;
  autorizaEventosPasseios?: boolean;
  podeIrEmboraSozinho?: boolean;
  cienteFrequenciaObrigatoria?: boolean;
  status: StatusGeral;
  turmaId?: number | null;
  nomeTurma?: string | null;
  totalOcorrenciasAtivas: number;
  totalAdvertenciasAtivas: number;
  totalSuspensoes: number;
  criadoEm: string;
  atualizadoEm: string;
  /* Indicadores da listagem (GET /api/assistidos) — ausentes/null nos demais endpoints. */
  responsavelNome?: string | null;
  responsavelParentesco?: string | null;
  responsavelTelefone?: string | null;
  /** % de presença nas aulas realizadas; null quando ainda não houve aula. */
  frequenciaPercentual?: number | null;
  totalAulas?: number | null;
  faltasConsecutivas?: number | null;
  /** Ativo com frequência < 75% ou 3+ faltas seguidas (regra no backend). */
  emAcompanhamento?: boolean | null;
  /** Listagem filtrada por turma: entrada e saída do assistido NESSA turma (saída null = ainda está). */
  dataEntradaTurma?: string | null;
  dataSaidaTurma?: string | null;
}