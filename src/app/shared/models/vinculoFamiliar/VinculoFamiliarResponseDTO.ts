import { Escolaridade } from '../../enum/Escolaridade';
import { EstadoCivil } from '../../enum/EstadoCivil';
import { EnderecoDTO } from '../endereco/EnderecoDTO';

export interface VinculoFamiliarResponseDTO {
  assistidoId: number;
  responsavelId: number;
  nomeResponsavel: string;
  dataNascimentoResponsavel?: string | null;
  cpfResponsavel: string | null;
  telefoneResponsavel: string | null;
  emailResponsavel: string | null;
  enderecoResponsavel?: EnderecoDTO | null;
  escolaridadeResponsavel?: Escolaridade | null;
  estadoCivilResponsavel?: EstadoCivil | null;
  profissaoResponsavel?: string | null;
  rendaResponsavel?: number | null;
  parentesco: string | null;
  responsavelPrincipal: boolean;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
  observacoes: string | null;
  criadoEm: string;
}
