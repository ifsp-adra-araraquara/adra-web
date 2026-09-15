export interface ResponsavelResponseDTO {
  responsavelId: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  cpf: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}