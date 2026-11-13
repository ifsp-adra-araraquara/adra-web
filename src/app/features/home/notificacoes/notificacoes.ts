import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { NotificacaoService } from '../../../core/notificacao.service';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { NotificacaoDTO, SituacaoEnvioDTO } from '../../../shared/models/notificacao/Notificacao';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

const POR_PAGINA = 20;

/**
 * /notificacoes (FT-14) — o histórico das notificações de quem está logado, mais
 * novas primeiro. O Administrador também vê como está o resumo diário por e-mail
 * e pode rodar o job na hora (não repete aviso: rodar de novo não manda outro e-mail).
 */
@Component({
  selector: 'app-notificacoes-pagina',
  imports: [DatePipe, Button, Icon],
  templateUrl: './notificacoes.html',
  styleUrl: './notificacoes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notificacoes implements OnInit {
  private readonly service = inject(NotificacaoService);
  private readonly router = inject(Router);
  protected readonly ehAdministrador = inject(AuthService).ehAdministrador;

  protected readonly notificacoes = signal<NotificacaoDTO[]>([]);
  protected readonly pagina = signal(0);
  protected readonly temMais = signal(false);
  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  protected readonly marcando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly envio = signal<SituacaoEnvioDTO | null>(null);
  protected readonly processando = signal(false);
  protected readonly resultado = signal<string | null>(null);

  protected readonly haNaoLidas = computed(
    () => this.service.naoLidas() > 0 || this.notificacoes().some((n) => !n.lida),
  );

  ngOnInit(): void {
    this.carregar();
    if (this.ehAdministrador()) this.carregarEnvio();
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const pagina = await this.service.listar(0, POR_PAGINA);
      this.notificacoes.set(pagina.conteudo);
      this.pagina.set(0);
      this.temMais.set(pagina.totalPaginas > 1);
      await this.service.contar();
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar as notificações.'));
    } finally {
      this.carregando.set(false);
    }
  }

  protected async carregarMais(): Promise<void> {
    this.carregandoMais.set(true);
    try {
      const proxima = this.pagina() + 1;
      const pagina = await this.service.listar(proxima, POR_PAGINA);
      this.notificacoes.update((lista) => [...lista, ...pagina.conteudo]);
      this.pagina.set(proxima);
      this.temMais.set(proxima + 1 < pagina.totalPaginas);
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar mais notificações.'));
    } finally {
      this.carregandoMais.set(false);
    }
  }

  protected async abrir(notificacao: NotificacaoDTO): Promise<void> {
    await this.marcarLida(notificacao);
    if (notificacao.link) this.router.navigateByUrl(notificacao.link);
  }

  protected async marcarLida(notificacao: NotificacaoDTO): Promise<void> {
    if (notificacao.lida) return;
    try {
      await this.service.marcarComoLida(notificacao);
      this.notificacoes.update((lista) =>
        lista.map((n) => (n.notificacaoId === notificacao.notificacaoId ? { ...n, lida: true } : n)),
      );
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível marcar como lida.'));
    }
  }

  protected async marcarTodas(): Promise<void> {
    this.marcando.set(true);
    try {
      await this.service.marcarTodasComoLidas();
      this.notificacoes.update((lista) => lista.map((n) => ({ ...n, lida: true })));
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível marcar as notificações como lidas.'));
    } finally {
      this.marcando.set(false);
    }
  }

  private async carregarEnvio(): Promise<void> {
    try {
      this.envio.set(await this.service.situacaoEnvio());
    } catch {
      this.envio.set(null);
    }
  }

  protected async processar(): Promise<void> {
    this.processando.set(true);
    this.resultado.set(null);
    this.erro.set(null);
    try {
      const r = await this.service.processar();
      this.resultado.set(
        `${r.geradas === 1 ? '1 notificação nova' : `${r.geradas} notificações novas`} · ` +
          `${r.mensagensEnviadas === 1 ? '1 e-mail enviado' : `${r.mensagensEnviadas} e-mails enviados`}.`,
      );
      await Promise.all([this.carregarEnvio(), this.carregar()]);
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível processar as notificações.'));
    } finally {
      this.processando.set(false);
    }
  }
}
