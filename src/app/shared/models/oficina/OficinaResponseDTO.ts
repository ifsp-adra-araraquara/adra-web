export interface OficinaResponseDTO {
  oficinaId: number;
  nomeOficina: string;
  ativo: boolean;
  oficineiroResponsavelId: number | null;
  local: string | null;
  /** Grupos atendidos pela oficina. */
  turmaIds: number[];
}
