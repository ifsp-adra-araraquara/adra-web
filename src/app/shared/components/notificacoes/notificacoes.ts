import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { AvisoService } from '../../../core/aviso.service';
import { Role } from '../../enum/role.enum';
import { AvisoDTO } from '../../models/aviso/Aviso';
import { acaoDoAviso, agruparAvisos, rotaDoAviso } from '../../utils/aviso.util';
import { Icon } from '../icon/icon';

/** FT-18: sino do cabeçalho com o painel suspenso de notificações (avisos do perfil logado). */
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
  private readonly auth = inject(AuthService);
  /** Educador Social só usa Chamada e Calendário. */
  private readonly soChamada = computed(() => this.auth.currentProfile() === Role.EDUCADOR);
  private readonly router = inject(Router);
  private readonly elemento = inject(ElementRef<HTMLElement>);

  readonly aberto = signal(false);
  readonly grupos = computed(() => agruparAvisos(this.avisoService.avisos()));
  readonly total = computed(() => this.avisoService.avisos().length);
  readonly rotulo = computed(() => `Notificações: ${this.total()} para resolver`);
  acao(aviso: AvisoDTO): string {
    return acaoDoAviso(aviso, this.soChamada());
  }

  constructor() {
    this.avisoService.carregar();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.avisoService.carregar());
  }

  alternar(): void {
    if (!this.aberto()) this.avisoService.carregar();
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
}
