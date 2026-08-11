export interface VinculoFamiliarComResponsavelRequestDTO {
  nomeCompleto: string;
  dataNascimento?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;

  parentesco?: string;
  responsavelPrincipal: boolean;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
}