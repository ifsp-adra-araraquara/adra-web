import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { MatriculaService } from '../../../core/matricula.service';
import { PeriodoMatriculaDTO } from '../../../shared/models/matricula/Matricula';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { Input } from '../../../shared/components/input/input';
import { Modal } from '../../../shared/components/modal/modal';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { hojeIso } from './periodo-matricula.util';

/**
 * Faixa do período de matrícula na tela de pré-cadastros. Enquanto o período
 * de um ano está aberto, o link público grava as inscrições nesse ano.
 * Abrir e ajustar é só do Coordenador; os demais só veem a situação.
 */
@Component({
  selector: 'app-periodo-matricula',
  imports: [DatePipe, FormsModule, Button, Icon, Input, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="faixa" role="status">
      <app-icon name="calendar" [size]="18" />
      <p class="texto">
        @if (aberto(); as p) {
          <b>Matrícula {{ p.ano }} aberta</b> desde {{ p.inicio | date: 'dd/MM/yyyy' }}
          @if (p.fim) { até {{ p.fim | date: 'dd/MM/yyyy' }} } @else { (sem data para fechar) }.
          O link de inscrição grava em {{ p.ano }}.
        } @else {
          Nenhum período de matrícula aberto: as inscrições do link valem para {{ anoCorrente }}.
        }
      </p>
      @if (podeEditar()) {
        <app-button variant="secondary" size="sm" (click)="abrirModal()">
          {{ aberto() ? 'Ajustar período' : 'Abrir matrícula de ' + proximoAno }}
        </app-button>
      }
    </div>

    <app-modal [(open)]="modalAberto" [title]="'Matrícula de ' + anoEditado()" size="sm">
      <p class="dica">
        Durante o período, quem preencher o link entra na lista de {{ anoEditado() }} — famílias novas e rematrículas,
        separadas da lista atual.
      </p>
      @if (erro()) {
        <div class="notice notice-error" role="alert">{{ erro() }}</div>
      }
      <div class="form-row">
        <app-input label="Início das inscrições" type="date" [required]="true" [ngModel]="inicio()" (ngModelChange)="inicio.set($event)" />
        <app-input label="Fim (opcional)" type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event)" />
      </div>
      <p class="dica">Sem data de fim, o período fica aberto até alguém ajustar.</p>

      <ng-template #footer>
        <app-button variant="secondary" (click)="modalAberto.set(false)">Cancelar</app-button>
        <app-button [loading]="salvando()" (click)="salvar()">Salvar</app-button>
      </ng-template>
    </app-modal>
  `,
  styles: `
    .faixa {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px;
      padding: 12px 16px; margin-bottom: 16px;
      border: 1px solid var(--gray-200); border-radius: var(--radius-sm); background: var(--gray-50);
      color: var(--gray-800);
    }
    .texto { flex: 1 1 260px; margin: 0; font-size: 14px; line-height: 1.5; }
    .dica { margin: 0 0 12px; font-size: 14px; color: var(--gray-600); }
  `,
})
export class PeriodoMatricula {
  private readonly service = inject(MatriculaService);

  readonly periodos = input.required<PeriodoMatriculaDTO[]>();
  readonly podeEditar = input(false);
  readonly salvo = output<PeriodoMatriculaDTO>();

  protected readonly anoCorrente = new Date().getFullYear();
  protected readonly proximoAno = this.anoCorrente + 1;

  protected readonly aberto = computed(() => this.periodos().find((p) => p.abertoHoje) ?? null);
  protected readonly anoEditado = computed(() => this.aberto()?.ano ?? this.proximoAno);

  protected readonly modalAberto = signal(false);
  protected readonly inicio = signal('');
  protected readonly fim = signal('');
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected abrirModal(): void {
    const atual = this.aberto();
    this.inicio.set(atual?.inicio ?? hojeIso());
    this.fim.set(atual?.fim ?? '');
    this.erro.set(null);
    this.modalAberto.set(true);
  }

  protected async salvar(): Promise<void> {
    if (this.salvando()) return;
    if (!this.inicio()) {
      this.erro.set('Informe a data de início das inscrições.');
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const salvo = await this.service.salvarPeriodo(this.anoEditado(), { inicio: this.inicio(), fim: this.fim() || null });
      this.modalAberto.set(false);
      this.salvo.emit(salvo);
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível salvar o período. Tente de novo.'));
    } finally {
      this.salvando.set(false);
    }
  }
}
