import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { SolicitacaoDesligamentoDTO } from '../shared/models/desligamento/SolicitacaoDesligamento';

/** Pedido de desligamento: a Assistente Social pede; o Coordenador aprova (inativa) ou recusa. */
@Injectable({ providedIn: 'root' })
export class DesligamentoService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/assistidos`;

  listar(): Promise<SolicitacaoDesligamentoDTO[]> {
    return firstValueFrom(this.http.get<SolicitacaoDesligamentoDTO[]>(`${this.api}/desligamentos`));
  }

  solicitar(assistidoId: number, dataSaida: string, motivo: string): Promise<SolicitacaoDesligamentoDTO> {
    return firstValueFrom(
      this.http.post<SolicitacaoDesligamentoDTO>(`${this.api}/${assistidoId}/desligamento`, { dataSaida, motivo }),
    );
  }

  cancelar(solicitacaoId: number): Promise<SolicitacaoDesligamentoDTO> {
    return firstValueFrom(this.http.patch<SolicitacaoDesligamentoDTO>(`${this.api}/desligamentos/${solicitacaoId}/cancelar`, {}));
  }

  aprovar(solicitacaoId: number): Promise<SolicitacaoDesligamentoDTO> {
    return firstValueFrom(this.http.patch<SolicitacaoDesligamentoDTO>(`${this.api}/desligamentos/${solicitacaoId}/aprovar`, {}));
  }

  recusar(solicitacaoId: number, resposta: string): Promise<SolicitacaoDesligamentoDTO> {
    return firstValueFrom(
      this.http.patch<SolicitacaoDesligamentoDTO>(`${this.api}/desligamentos/${solicitacaoId}/recusar`, { resposta }),
    );
  }
}
