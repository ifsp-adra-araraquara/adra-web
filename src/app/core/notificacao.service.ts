import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginaResponse } from '../shared/models/PaginaResponse';
import {
  NotificacaoDTO,
  ResultadoProcessamentoDTO,
  SituacaoEnvioDTO,
} from '../shared/models/notificacao/Notificacao';

/** Quantas não lidas o sino mostra; o resto fica na tela de notificações. */
const NOVAS_NO_SINO = 5;

/**
 * FT-14: notificações guardadas do usuário logado — /api/notificacoes. Diferente dos
 * avisos (FT-18), ficam registradas: somem do sino quando lidas, não quando resolvidas.
 */
@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/notificacoes`;

  readonly naoLidas = signal(0);
  /** Não lidas mais recentes, para o sino. */
  readonly novas = signal<NotificacaoDTO[]>([]);

  /** Só o total: roda a cada navegação, então fica leve. */
  async contar(): Promise<void> {
    try {
      this.naoLidas.set((await firstValueFrom(this.http.get<{ total: number }>(`${this.api}/nao-lidas`))).total);
    } catch {
      this.naoLidas.set(0);
    }
  }

  /** As não lidas mais recentes, ao abrir o sino. */
  async carregarNovas(): Promise<void> {
    try {
      const pagina = await this.listar(0, 20);
      this.novas.set(pagina.conteudo.filter((n) => !n.lida).slice(0, NOVAS_NO_SINO));
    } catch {
      this.novas.set([]);
    }
  }

  listar(pagina: number, tamanho = 20): Promise<PaginaResponse<NotificacaoDTO>> {
    const params = new HttpParams().set('pagina', pagina).set('tamanho', tamanho);
    return firstValueFrom(this.http.get<PaginaResponse<NotificacaoDTO>>(this.api, { params }));
  }

  async marcarComoLida(notificacao: NotificacaoDTO): Promise<void> {
    if (notificacao.lida) return;
    await firstValueFrom(this.http.patch<void>(`${this.api}/${notificacao.notificacaoId}/lida`, null));
    this.novas.update((lista) => lista.filter((n) => n.notificacaoId !== notificacao.notificacaoId));
    this.naoLidas.update((total) => Math.max(0, total - 1));
  }

  async marcarTodasComoLidas(): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${this.api}/lidas`, null));
    this.novas.set([]);
    this.naoLidas.set(0);
  }

  situacaoEnvio(): Promise<SituacaoEnvioDTO> {
    return firstValueFrom(this.http.get<SituacaoEnvioDTO>(`${this.api}/envio`));
  }

  processar(): Promise<ResultadoProcessamentoDTO> {
    return firstValueFrom(this.http.post<ResultadoProcessamentoDTO>(`${this.api}/processar`, null));
  }
}
