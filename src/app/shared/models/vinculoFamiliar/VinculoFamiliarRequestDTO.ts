export interface VinculoFamiliarRequestDTO {
  responsavelId: number;
  parentesco?: string;
  responsavelPrincipal: boolean;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
  observacoes?: string;
}