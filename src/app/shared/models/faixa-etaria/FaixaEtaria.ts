export interface FaixaEtariaDTO {
  faixaEtariaId: number;
  idadeMinima: number;
  idadeMaxima: number;
  /** Ex.: "6–10 anos". */
  rotulo: string;
  ativo: boolean;
}

export interface FaixaEtariaRequestDTO {
  idadeMinima: number;
  idadeMaxima: number;
  ativo?: boolean;
}
