import { Role } from '../enum/role.enum';

interface Usuario {
  id: number;
  nomeCompleto: string;
  email: string;
  cargoFuncao: string;
  nivelPermissao: Role;
  ultimoAcesso: string | null;
  ativo: boolean;
}