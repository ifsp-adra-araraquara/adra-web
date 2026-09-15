import { ResponsavelResponseDTO } from './ResponsavelResponseDTO';

export interface AlertaCpfDuplicadoDTO {
  mensagem: string;
  responsavelExistente: ResponsavelResponseDTO;
}