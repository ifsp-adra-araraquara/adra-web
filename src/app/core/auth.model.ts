export interface LoginRequestDTO {
  email: string;
  senha: string;
}

export interface UsuarioResponseDTO {
  usuarioId: number;
  nomeCompleto: string;
  email: string;
  nivelPermissao: string; // NomeNivelPermissao serializado
  especialidade: string | null;
  cargoFuncao: string | null;
  telefone: string | null;
  ativo: boolean;
  ultimoLogin: string | null;
  criadoEm: string;
  atualizadoEm: string;
}