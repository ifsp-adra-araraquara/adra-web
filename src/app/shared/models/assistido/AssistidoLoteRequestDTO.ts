import { AssistidoRequestDTO } from './AssistidoRequestDTO';

// Data inválida segue como null para a API devolver o erro na linha certa.
export type AssistidoLoteRequestDTO = Omit<AssistidoRequestDTO, 'dataNascimento'> & { dataNascimento: string | null };
