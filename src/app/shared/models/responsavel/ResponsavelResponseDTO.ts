import { Escolaridade } from '../../enum/Escolaridade';
import { EstadoCivil } from '../../enum/EstadoCivil';
import { EnderecoDTO } from '../endereco/EnderecoDTO';

export interface ResponsavelResponseDTO {
  responsavelId: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  cpf: string;
  telefone: string | null;
  email: string | null;
  endereco: EnderecoDTO | null;
  observacoes: string | null;
  escolaridade: Escolaridade | null;
  estadoCivil: EstadoCivil | null;
  profissao: string | null;
  renda: number | null;
  criadoEm: string;
  atualizadoEm: string;
}
