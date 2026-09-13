import { VinculoFamiliarComResponsavelRequestDTO } from '../vinculoFamiliar/VinculoFamiliarComResponsavelRequestDTO';

export interface AssistidoRequestDTO {
  nomeCompleto: string;
  dataNascimento: string;
  cpf?: string;
  dataEntrada?: string;
  necessidadesEspecificas?: string;
  observacoes?: string;
  turmaId?: number | null;
  responsaveis?: VinculoFamiliarComResponsavelRequestDTO[];
  confirmarApesarDeDuplicidade: boolean;
}