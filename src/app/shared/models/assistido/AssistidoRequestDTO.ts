export interface AssistidoRequestDTO {
  nomeCompleto: string;
  dataNascimento: string;
  cpf?: string;
  dataEntrada?: string;
  necessidadesEspecificas?: string;
  observacoes?: string;
  confirmarApesarDeDuplicidade: boolean;
}