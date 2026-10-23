import { Escolaridade } from '../../enum/Escolaridade';
import { EstadoCivil } from '../../enum/EstadoCivil';
import { EnderecoDTO } from '../endereco/EnderecoDTO';

export interface ResponsavelRequestDTO {
  nomeCompleto: string;
  dataNascimento?: string;
  cpf: string;
  telefone?: string;
  email?: string;
  endereco?: EnderecoDTO | null;
  observacoes?: string;
  escolaridade?: Escolaridade | null;
  estadoCivil?: EstadoCivil | null;
  profissao?: string | null;
  /** Renda mensal individual, em reais. */
  renda?: number | null;
}
