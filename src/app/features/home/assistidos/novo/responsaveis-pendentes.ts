import { ChangeDetectionStrategy, Component, computed, model, signal } from '@angular/core';

import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { TooltipDirective } from '../../../../shared/components/tooltip/tooltip';
import { formatarCpf } from '../../../../shared/validators/cpf.validator';
import { formatarTelefone } from '../../../../shared/utils/mascara.util';
import { ResponsavelPendente } from '../assistido-form.util';
import { ResponsavelVinculoModal } from './responsavel-vinculo-modal';

/**
 * Responsáveis informados num cadastro que ainda não foi salvo: lista com
 * editar/remover e o modal para incluir. Sempre sobra um principal.
 * Usado no novo assistido e na aprovação do pré-cadastro.
 *
 *   <app-responsaveis-pendentes [(responsaveis)]="responsaveis" />
 */
@Component({
  selector: 'app-responsaveis-pendentes',
  imports: [Badge, Button, Icon, TooltipDirective, ResponsavelVinculoModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
  template: `
    @if (responsaveis().length === 0) {
      <p class="vazio">Nenhum responsável ainda. Adicione pelo menos um.</p>
    } @else {
      <ul class="resp-lista" role="list">
        @for (r of responsaveis(); track r.cpf; let i = $index) {
          <li class="resp-card">
            <div class="resp-card__topo">
              <div>
                <span class="cell-name">{{ r.nomeCompleto }}</span>
                <span class="cell-sub">{{ r.parentesco || 'Parentesco não informado' }} · CPF {{ formatarCpf(r.cpf) }}</span>
              </div>
              <div class="resp-card__acoes">
                <button type="button" class="btn-icon" [attr.aria-label]="'Editar ' + r.nomeCompleto" appTooltip="Editar" (click)="editar(i)">
                  <app-icon name="edit" />
                </button>
                <button type="button" class="btn-icon" [attr.aria-label]="'Remover ' + r.nomeCompleto" appTooltip="Remover" (click)="remover(i)">
                  <app-icon name="trash" />
                </button>
              </div>
            </div>
            <div class="resp-card__selos">
              @if (r.responsavelId) { <app-badge variant="gray" label="Já cadastrado" /> }
              @if (r.responsavelPrincipal) { <app-badge variant="blue" label="Principal" /> }
              @if (r.contatoEmergencia) { <app-badge variant="green" label="Emergência" /> }
              @if (r.autorizadoRetirada) { <app-badge variant="amber" label="Pode retirar" /> }
              @if (r.telefone) { <span class="cell-sub">{{ formatarTelefone(r.telefone) }}</span> }
            </div>
          </li>
        }
      </ul>
    }

    <app-button variant="secondary" size="sm" (click)="adicionar()">
      <app-icon name="plus" [size]="16" /> Adicionar responsável
    </app-button>

    <app-responsavel-vinculo-modal
      [(open)]="modalAberto"
      [inicial]="emEdicao()"
      [cpfsUsados]="cpfsUsados()"
      (confirmado)="confirmado($event)"
    />
  `,
  styles: `
    .vazio { margin: 0 0 12px; font-size: 14px; font-style: italic; color: var(--gray-600); }
    .resp-lista { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .resp-card { padding: 12px 14px; border: 1px solid var(--borda); border-radius: var(--radius); }
    .resp-card__topo { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .resp-card__topo .cell-sub { display: block; }
    .resp-card__acoes { display: flex; gap: 6px; }
    .resp-card__selos { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; }
  `,
})
export class ResponsaveisPendentes {
  responsaveis = model.required<ResponsavelPendente[]>();

  protected readonly formatarCpf = formatarCpf;
  protected readonly formatarTelefone = formatarTelefone;

  protected readonly modalAberto = signal(false);
  /** Índice em `responsaveis` sendo editado; null = incluindo. */
  private readonly indiceEmEdicao = signal<number | null>(null);
  protected readonly emEdicao = computed(() => {
    const i = this.indiceEmEdicao();
    return i == null ? null : (this.responsaveis()[i] ?? null);
  });
  protected readonly cpfsUsados = computed(() =>
    this.responsaveis()
      .filter((_, i) => i !== this.indiceEmEdicao())
      .map((r) => r.cpf),
  );

  protected adicionar(): void {
    this.indiceEmEdicao.set(null);
    this.modalAberto.set(true);
  }

  protected editar(indice: number): void {
    this.indiceEmEdicao.set(indice);
    this.modalAberto.set(true);
  }

  protected remover(indice: number): void {
    let lista = this.responsaveis().filter((_, i) => i !== indice);
    // sempre sobra um principal
    if (lista.length > 0 && !lista.some((r) => r.responsavelPrincipal)) {
      lista = lista.map((r, i) => (i === 0 ? { ...r, responsavelPrincipal: true } : r));
    }
    this.responsaveis.set(lista);
  }

  /** Volta do modal: inclui ou substitui, mantendo um único principal (o primeiro vira principal). */
  protected confirmado(responsavel: ResponsavelPendente): void {
    const indice = this.indiceEmEdicao();
    const outros = this.responsaveis().filter((_, i) => i !== indice);
    const principal = responsavel.responsavelPrincipal || !outros.some((r) => r.responsavelPrincipal);
    const novo = { ...responsavel, responsavelPrincipal: principal };

    this.responsaveis.update((lista) => {
      const ajustada = responsavel.responsavelPrincipal
        ? lista.map((r) => ({ ...r, responsavelPrincipal: false }))
        : lista;
      return indice == null ? [...ajustada, novo] : ajustada.map((r, i) => (i === indice ? novo : r));
    });
    this.indiceEmEdicao.set(null);
  }
}
