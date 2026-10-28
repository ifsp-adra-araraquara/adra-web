import { CategoriaArquivo } from '../../enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../enum/EntidadeArquivo';

export interface ArquivoResponseDTO {
  arquivoId: number;
  entidadeTipo: EntidadeArquivo;
  entidadeId: number;
  categoria: CategoriaArquivo;
  nomeOriginal: string | null;
  mimeType: string;
  tamanhoBytes: number;
  criadoEm: string;
  /** Quem enviou (null em arquivos antigos sem autor gravado). */
  enviadoPorId: number | null;
  enviadoPorNome: string | null;
}
