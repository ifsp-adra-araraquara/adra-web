import { StatusAula } from '../../enum/StatusAula';
import { ArquivoResponseDTO } from './ArquivoResponseDTO';

/** Espelha AulaArquivoDTO do back: uma aula com os materiais vinculados a ela. */
export interface AulaArquivoDTO {
  aulaId: number;
  titulo: string | null;
  dataAula: string;
  statusAula: StatusAula;
  nomeTurma: string | null;
  arquivos: ArquivoResponseDTO[];
}
