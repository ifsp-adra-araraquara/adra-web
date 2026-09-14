import { VinculoFamiliarComResponsavelRequestDTO } from '../vinculoFamiliar/VinculoFamiliarComResponsavelRequestDTO';
import { VinculoFamiliarRequestDTO } from '../vinculoFamiliar/VinculoFamiliarRequestDTO';

export interface AssistidoRequestDTO {
  nomeCompleto: string;
  dataNascimento: string;
  cpf?: string;
  dataEntrada?: string;
  necessidadesEspecificas?: string;
  observacoes?: string;
  turmaId?: number | null;
  // Responsáveis NOVOS a cadastrar e vincular nesta chamada.
  responsaveis?: VinculoFamiliarComResponsavelRequestDTO[];
  // CA-A04: responsáveis JÁ vinculados que devem ser mantidos. Um vínculo
  // existente que não aparecer aqui é desvinculado (só ADMIN pode remover).
  responsaveisVinculados?: VinculoFamiliarRequestDTO[];
  confirmarApesarDeDuplicidade: boolean;
}