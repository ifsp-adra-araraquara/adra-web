import { AulaResponseDTO } from './AulaResponseDTO';

export interface GerarAulasResponseDTO {
  aulasCriadas: number;
  aulasExcecaoPuladas: number;
  aulasDuplicadasPuladas: number;
  aulas: AulaResponseDTO[];
}
