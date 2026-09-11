export interface AssistidoRequestDTO {
  nomeCompleto: string;
  dataNascimento: string;
  cpf?: string;
  dataEntrada?: string;
  necessidadesEspecificas?: string;
  observacoes?: string;
  turmaId?: number | null;
  confirmarApesarDeDuplicidade: boolean;
}