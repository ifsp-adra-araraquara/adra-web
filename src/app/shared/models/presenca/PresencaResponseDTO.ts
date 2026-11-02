import { StatusPresenca } from '../../enum/StatusPresenca';
import { MotivoFalta } from '../../enum/MotivoFalta';

/** Um dia do histórico recente do atendido (faixa de dias na chamada). */
export interface PresencaHistoricoDTO {
  dataAula: string;
  statusPresenca: StatusPresenca;
}

export interface AutorizadoRetiradaDTO {
  nome: string;
  parentesco: string | null;
  telefone: string | null;
}
