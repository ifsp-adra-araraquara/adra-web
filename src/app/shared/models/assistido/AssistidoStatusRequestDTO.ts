import { StatusGeral } from '../../enum/StatusGeral'


export interface AssistidoStatusRequestDTO {
  status: StatusGeral;
  dataSaida?: string;
  motivoSaida?: string;
}