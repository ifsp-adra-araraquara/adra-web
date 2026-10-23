import { Sexo } from '../../enum/Sexo';
import { ProgramaTransferencia } from '../../enum/ProgramaTransferencia';
import { Turno } from '../../enum/Turno';
import { EnderecoDTO } from '../endereco/EnderecoDTO';
import { VinculoFamiliarComResponsavelRequestDTO } from '../vinculoFamiliar/VinculoFamiliarComResponsavelRequestDTO';
import { VinculoFamiliarRequestDTO } from '../vinculoFamiliar/VinculoFamiliarRequestDTO';

export interface AssistidoRequestDTO {
  nomeCompleto: string;
  dataNascimento: string;
  cpf?: string;
  dataEntrada?: string;
  necessidadesEspecificas?: string;
  observacoes?: string;
  turmaId?: number | null;
  sexo?: Sexo | null;
  /** Quando true, `problemaSaude` ("Qual?") é obrigatório. */
  possuiProblemaSaude?: boolean | null;
  problemaSaude?: string | null;
  /** Quando true, `deficiencia` ("Qual deficiência?") é obrigatória. */
  pcd?: boolean | null;
  deficiencia?: string | null;
  escolaNome?: string | null;
  escolaAnoSerie?: string | null;
  escolaTurno?: Turno | null;
  estudaContraturno?: boolean | null;
  endereco?: EnderecoDTO | null;
  /* Socioeconômico (família) */
  rendaFamiliar?: number | null;
  /** Quando true, exige ao menos um programa; OUTRO exige `programaTransferenciaOutro`. */
  recebeProgramaTransferencia?: boolean | null;
  programasTransferencia?: ProgramaTransferencia[];
  programaTransferenciaOutro?: string | null;
  /** NIS / CadÚnico — 11 dígitos. */
  nis?: string | null;
  /* Termos e autorizações (aceite LGPD obrigatório no cadastro) */
  aceiteLgpd?: boolean;
  autorizaUsoImagem?: boolean;
  autorizaEventosPasseios?: boolean;
  podeIrEmboraSozinho?: boolean;
  cienteFrequenciaObrigatoria?: boolean;
  // Responsáveis NOVOS a cadastrar e vincular nesta chamada.
  responsaveis?: VinculoFamiliarComResponsavelRequestDTO[];
  // CA-A04: responsáveis JÁ vinculados que devem ser mantidos. Um vínculo
  // existente que não aparecer aqui é desvinculado (só ADMIN pode remover).
  responsaveisVinculados?: VinculoFamiliarRequestDTO[];
}