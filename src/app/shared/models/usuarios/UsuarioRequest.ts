import { Role } from '../../enum/role.enum';

export interface UsuarioRequest {
  nomeCompleto: string;
  email: string;
  nivelPermissao: Role;
  cargoFuncao: string;
  telefone: string;
}