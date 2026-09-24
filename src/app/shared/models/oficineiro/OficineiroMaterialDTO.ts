export interface OficineiroMaterialDTO {
  materialId: number;
  titulo: string;
  tipo: string;
  tamanho: string | null;
  turmaId: number | null;
  nomeTurma: string | null;
  oficinaId: number | null;
  nomeOficina: string | null;
  url: string;
  ativo: boolean;
}