export interface VinculoFamiliarResponseDTO {
  assistidoId: number;
  responsavelId: number;
  nomeResponsavel: string;
   cpfResponsavel: string | null; 
  telefoneResponsavel: string | null;
  emailResponsavel: string | null;
  parentesco: string | null;
  responsavelPrincipal: boolean;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
  observacoes: string | null;
  criadoEm: string;
}