import { Role } from '../../enum/role.enum';

export interface UsuarioResponse {
  usuarioId: number;
  nomeCompleto: string;
  email: string;
  nivelPermissao: Role;
  especialidade: null;
  cargoFuncao: string | null;
  telefone: string | null;
  ativo: boolean;
  ultimoLogin: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
}