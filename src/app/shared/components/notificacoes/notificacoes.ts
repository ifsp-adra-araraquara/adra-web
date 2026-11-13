import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { AvisoService } from '../../../core/aviso.service';
import { NotificacaoService } from '../../../core/notificacao.service';
import { Role } from '../../enum/role.enum';
import { AvisoDTO } from '../../models/aviso/Aviso';
import { NotificacaoDTO } from '../../models/notificacao/Notificacao';
import { acaoDoAviso, agruparAvisos, rotaDoAviso } from '../../utils/aviso.util';
import { Icon } from '../icon/icon';

/**
 * Sino do cabeçalho. Em cima, as notificações novas (FT-14, guardadas: somem quando lidas);
 * embaixo, os avisos do perfil (FT-18, calculados: somem quando resolvidos).
 */
@Component({
  selector: 'app-notificacoes',
  imports: [Icon],
  templateUrl: './notificacoes.html',
  styleUrl: './notificacoes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'fechar()',
    '(document:click)': 'fecharAoClicarFora($event)',
  },
})
export class Notificacoes {
  private readonly avisoService = inject(AvisoService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly auth = inject(AuthService);
  /** Educador Social só usa Chamada e Calendário. */
  private readonly soChamada = computed(() => this.auth.currentProfile() === Role.EDUCADOR);
  private readonly router = inject(Router);
  private readonly elemento = inject(ElementRef<HTMLElement>);

  readonly aberto = signal(false);
  readonly grupos = computed(() => agruparAvisos(this.avisoService.avisos()));
  readonly pendencias = computed(() => this.avisoService.avisos().length);
  readonly novas = this.notificacaoService.novas;
  readonly naoLidas = this.notificacaoService.naoLidas;
  readonly total = computed(() => this.pendencias() + this.naoLidas());
  readonly rotulo = computed(() => {
    const partes = [`${this.pendencias()} para resolver`];
    if (this.naoLidas() > 0) partes.push(`${this.naoLidas()} ${this.naoLidas() === 1 ? 'nova' : 'novas'}`);
    return `Notificações: ${partes.join(', ')}`;
  });
  acao(aviso: AvisoDTO): string {
    return acaoDoAviso(aviso, this.soChamada());
  }

  constructor() {
    this.recarregar();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.recarregar());
  }

  private recarregar(): void {
    this.avisoService.carregar();
    this.notificacaoService.contar();
  }

  alternar(): void {
    if (!this.aberto()) {
      this.avisoService.carregar();
      this.notificacaoService.carregarNovas();
    }
    this.aberto.update((v) => !v);
  }

  fechar(): void {
    this.aberto.set(false);
  }

  fecharAoClicarFora(evento: MouseEvent): void {
    if (this.aberto() && !this.elemento.nativeElement.contains(evento.target as Node)) this.fechar();
  }

  abrir(aviso: AvisoDTO): void {
    this.fechar();
    const rota = rotaDoAviso(aviso, this.soChamada());
    this.router.navigate(rota.comandos, { queryParams: rota.queryParams });
  }

  abrirNotificacao(notificacao: NotificacaoDTO): void {
    this.fechar();
    this.notificacaoService.marcarComoLida(notificacao).catch(() => undefined);
    this.router.navigateByUrl(notificacao.link ?? '/notificacoes');
  }

  verTodas(): void {
    this.fechar();
    this.router.navigateByUrl('/notificacoes');
  }
}
