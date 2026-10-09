
export interface LoginRequestDTO {
  email: string;
  senha: string;
}

export interface UsuarioResponseDTO {
  usuarioId: number;
  nomeCompleto: string;
  email: string;
  nivelPermissao: string; // NomeNivelPermissao serializado
  cargoFuncao: string | null;
  telefone: string | null;
  ativo: boolean;
  ultimoLogin: string | null;
  criadoEm: string;
  atualizadoEm: string;
  modulos: ModuloDTO[];
}

export interface ModuloDTO {
  codigo: string;
  nomeExibicao: string;
  rota: string | null;
  icone: string | null;
  padrao: boolean; // true = módulo padrão do perfil (equivalente ao defaultPage)
}