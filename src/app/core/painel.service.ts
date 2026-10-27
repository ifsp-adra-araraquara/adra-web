import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { PainelHojeDTO, PainelMensalDTO } from '../shared/models/painel/Painel';
import { OficinaResponseDTO } from '../shared/models/oficina/OficinaResponseDTO';

export interface OficinaOpcao {
  oficinaId: number;
  nome: string;
}

/**
 * FT-05 — Painel do Coordenador. Cada combinação mês + oficina já aberta
 * fica em memória durante a sessão (é o mesmo dado, já agregado): voltar a
 * ela é instantâneo e não bate na API. "Atualizar" (recarregar = true)
 * descarta o cache. A lista de oficinas do filtro é pedida uma vez só.
 */
@Injectable({ providedIn: 'root' })
export class PainelService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/painel`;
  private readonly meses = new Map<string, Promise<PainelMensalDTO>>();

  private oficinasPedido: Promise<OficinaOpcao[]> | null = null;

  mensal(mes: string, oficinaId: number | null, recarregar = false): Promise<PainelMensalDTO> {
    const chave = `${mes}|${oficinaId ?? ''}`;
    if (recarregar) this.meses.clear();
    let pedido = this.meses.get(chave);
    if (!pedido) {
      const params: Record<string, string | number> = { mes };
      if (oficinaId != null) params['oficinaId'] = oficinaId;
      pedido = firstValueFrom(this.http.get<PainelMensalDTO>(`${this.api}/mensal`, { params }));
      // Falhou: não guarda, para a próxima tentativa refazer o pedido.
      pedido.catch(() => this.meses.delete(chave));
      this.meses.set(chave, pedido);
    }
    return pedido;
  }

  /** Oficinas ativas para o filtro — só id e nome, ordenadas. */
  oficinas(): Promise<OficinaOpcao[]> {
    this.oficinasPedido ??= firstValueFrom(
      this.http.get<OficinaResponseDTO[]>(`${environment.apiUrl}/api/oficinas`),
    )
      .then((lista) =>
        lista
          .filter((o) => o.ativo)
          .map((o) => ({ oficinaId: o.oficinaId, nome: o.nomeOficina }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      )
      .catch((erro) => {
        this.oficinasPedido = null;
        throw erro;
      });
    return this.oficinasPedido;
  }

  hoje(): Promise<PainelHojeDTO> {
    return firstValueFrom(this.http.get<PainelHojeDTO>(`${this.api}/hoje`));
  }

  /** Depois de lançar chamada ou registro, os números do mês corrente mudam. */
  limpar(): void {
    this.meses.clear();
  }
}
