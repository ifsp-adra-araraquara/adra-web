import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { PreCadastroService } from '../../../core/pre-cadastro.service';
import { PreCadastroResumoDTO, StatusPreCadastro } from '../../../shared/models/precadastro/PreCadastro';
import { Badge } from '../../../shared/components/badge/badge';
import { Icon } from '../../../shared/components/icon/icon';
import { Input } from '../../../shared/components/input/input';
import { LinkInscricao } from './link-inscricao';
import { formatarTelefone } from '../../../shared/utils/mascara.util';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

const ABAS: { status: StatusPreCadastro; rotulo: string; vazio: string }[] = [
  { status: 'PENDENTE', rotulo: 'Pendentes', vazio: 'Nenhuma inscrição aguardando avaliação.' },
  { status: 'CONVERTIDO', rotulo: 'Aprovados', vazio: 'Nenhuma inscrição aprovada ainda.' },
  { status: 'DESCARTADO', rotulo: 'Reprovados', vazio: 'Nenhuma inscrição reprovada.' },
];

const UM_DIA = 24 * 60 * 60 * 1000;

/** "hoje", "ontem", "há 3 dias" — quanto tempo a inscrição está esperando. */
export function haQuantoTempo(criadoEm: string, agora: Date): string {
  const dias = Math.floor((agora.getTime() - new Date(criadoEm).getTime()) / UM_DIA);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}

/** Inscrições enviadas pelo link público, para a Coordenação e a Assistente Social avaliarem. */
@Component({
  selector: 'app-pre-cadastros',
  imports: [RouterLink, Badge, Icon, Input, LinkInscricao],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page" aria-labelledby="pc-lista-titulo">
      <header class="page-header">
        <div class="page-header-texto">
          <h1 id="pc-lista-titulo">Pré-cadastros</h1>
          <p class="page-intro">Inscrições enviadas pelas famílias pelo link público.</p>
        </div>
        <div class="page-header-acoes">
          <app-link-inscricao />
        </div>
      </header>

      @if (erro()) {
        <div class="notice notice-error" role="alert">{{ erro() }}</div>
      }

      <div class="tabs" role="tablist" aria-label="Situação da inscrição">
        @for (aba of abas; track aba.status) {
          <button
            type="button"
            role="tab"
            class="tab"
            [class.active]="aba.status === status()"
            [attr.aria-selected]="aba.status === status()"
            (click)="status.set(aba.status)"
          >
            {{ aba.rotulo }} <span class="count">{{ porStatus()[aba.status].length }}</span>
          </button>
        }
      </div>

      <div class="busca">
        <app-input label="Buscar por nome" [hideLabel]="true" placeholder="Buscar por nome" (input)="busca.set($any($event.target).value)" />
      </div>

      @if (carregando()) {
        <div class="card card-pad"><p class="muted">Carregando…</p></div>
      } @else if (visiveis().length === 0) {
        <div class="card card-pad"><p class="muted">{{ busca() ? 'Nenhum nome encontrado.' : abaAtual().vazio }}</p></div>
      } @else {
        <ul class="lista" role="list">
          @for (item of visiveis(); track item.preCadastroId) {
            <li class="card item">
              <a class="item__link" [routerLink]="['/pre-cadastros', item.preCadastroId]">
                <span class="item__nome">{{ item.nomeCompleto }}</span>
                <span class="item__sub">
                  @if (item.idade != null) { {{ item.idade }} anos · }
                  Responsável: {{ item.responsavelNome }}
                </span>
              </a>
              <div class="item__rodape">
                @if (item.responsavelTelefone) {
                  <a class="item__tel" [href]="'tel:' + item.responsavelTelefone">
                    <app-icon name="phone" [size]="14" /> {{ formatarTelefone(item.responsavelTelefone) }}
                  </a>
                }
                <span class="item__quando">Chegou {{ haQuantoTempo(item.criadoEm) }}</span>
                @if (item.cpfJaCadastrado) { <app-badge variant="amber" label="CPF já cadastrado" /> }
                @if (item.anexosFaltando.length) {
                  <app-badge variant="amber" [label]="'Faltam: ' + item.anexosFaltando.join(', ').toLocaleLowerCase('pt-BR')" />
                }
                @if (status() !== 'PENDENTE') { <app-badge [status]="item.status" /> }
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .busca { max-width: 420px; margin-bottom: 14px; }
    .lista { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    @media (min-width: 900px) { .lista { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .item { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
    .item__link { display: flex; flex-direction: column; gap: 4px; min-height: 44px; color: inherit; text-decoration: none; }
    .item__link:hover .item__nome { color: var(--color-adra-green-600); text-decoration: underline; }
    .item__nome { font-size: 16px; font-weight: 600; color: var(--gray-800); }
    .item__sub, .item__quando { font-size: 13px; color: var(--gray-600); }
    .item__rodape { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
    .item__tel { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-size: 14px; color: var(--color-adra-green-600); }
  `,
})
export class PreCadastros implements OnInit {
  private readonly service = inject(PreCadastroService);

  protected readonly abas = ABAS;
  protected readonly formatarTelefone = formatarTelefone;
  private readonly agora = new Date();

  protected readonly status = signal<StatusPreCadastro>('PENDENTE');
  protected readonly busca = signal('');
  protected readonly porStatus = signal<Record<StatusPreCadastro, PreCadastroResumoDTO[]>>({
    PENDENTE: [],
    CONVERTIDO: [],
    DESCARTADO: [],
  });
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly abaAtual = computed(() => ABAS.find((aba) => aba.status === this.status())!);
  protected readonly visiveis = computed(() => {
    const termo = this.busca().trim().toLocaleLowerCase('pt-BR');
    const lista = this.porStatus()[this.status()];
    return termo ? lista.filter((item) => item.nomeCompleto.toLocaleLowerCase('pt-BR').includes(termo)) : lista;
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected haQuantoTempo(criadoEm: string): string {
    return haQuantoTempo(criadoEm, this.agora);
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const [pendentes, aprovados, reprovados] = await Promise.all(ABAS.map((aba) => this.service.listar(aba.status)));
      this.porStatus.set({ PENDENTE: pendentes, CONVERTIDO: aprovados, DESCARTADO: reprovados });
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar os pré-cadastros.'));
    } finally {
      this.carregando.set(false);
    }
  }
}
