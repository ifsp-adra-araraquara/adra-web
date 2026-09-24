export interface OficinaResponseDTO {
  oficinaId: number;
  nomeOficina: string;
  ativo: boolean;
  oficineiroResponsavelId: number | null;
}
