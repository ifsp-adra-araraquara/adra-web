export interface PreCadastroRequestDTO {
  nomeCompleto: string;
  dataNascimento: string | null;
  responsavelNome: string;
  responsavelTelefone: string | null;
  endereco: string | null;
  observacao: string | null;
  /** Honeypot: sempre vazio para humanos; se vier preenchido, o backend descarta como robô. */
  site: string;
}

export type StatusPreCadastro = 'PENDENTE' | 'CONVERTIDO' | 'DESCARTADO';

export interface PreCadastroResponseDTO {
  preCadastroId: number;
  nomeCompleto: string;
  dataNascimento: string | null;
  responsavelNome: string;
  responsavelTelefone: string | null;
  endereco: string | null;
  observacao: string | null;
  status: StatusPreCadastro;
  revisadoPorNome: string | null;
  revisadoEm: string | null;
  criadoEm: string;
}
