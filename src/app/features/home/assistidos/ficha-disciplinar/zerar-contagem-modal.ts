import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DisciplinarService } from '../../../../core/disciplinar.service';
import { NIVEIS_DISCIPLINARES, NivelDisciplinar, ORDEM_NIVEIS } from '../../../../shared/enum/NivelDisciplinar';
import { FichaDisciplinarDTO, ResumoDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';
import { ativosDoNivel, descreverQuantidades } from '../../../../shared/utils/disciplinar.util';
import { mensagemErro } from '../../../../shared/utils/erro-http.util';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';

type Escopo = NivelDisciplinar | 'TODOS';

/** FT-24: confirmação, com ciência, para zerar a contagem disciplinar de um atendido. */
@Component({
  selector: 'app-zerar-contagem-modal',
  imports: [FormsModule, Button, Icon, Modal],
  templateUrl: './zerar-contagem-modal.html',
  styleUrl: './zerar-contagem-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZerarContagemModal {
  private readonly disciplinarService = inject(DisciplinarService);
  private readonly injector = inject(Injector);

  open = model(false);
  assistidoId = input.required<number>();
  nome = input.required<string>();
  resumo = input.required<ResumoDisciplinarDTO>();

  zerado = output<FichaDisciplinarDTO>();

  private readonly botaoCancelar = viewChild('cancelar', { read: ElementRef<HTMLElement> });

  readonly escopo = signal<Escopo>('TODOS');
  readonly motivo = signal('');
  readonly ciente = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly opcoes = computed(() => [
    { valor: 'TODOS' as Escopo, rotulo: 'Tudo' },
    ...ORDEM_NIVEIS.filter((n) => ativosDoNivel(this.resumo(), n) > 0).map((n) => ({
      valor: n as Escopo,
      rotulo: NIVEIS_DISCIPLINARES[n].plural,
    })),
  ]);
  readonly nivelEscolhido = computed(() => (this.escopo() === 'TODOS' ? null : (this.escopo() as NivelDisciplinar)));
  readonly descricao = computed(() => descreverQuantidades(this.resumo(), this.nivelEscolhido()));
  readonly podeZerar = computed(() => !!this.motivo().trim() && this.ciente() && !this.salvando());

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.limpar();
      afterNextRender(() => this.botaoCancelar()?.nativeElement.querySelector('button')?.focus(), {
        injector: this.injector,
      });
    });
  }

  fechar(): void {
    this.open.set(false);
  }

  async zerar(): Promise<void> {
    if (!this.podeZerar()) return;
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const ficha = await this.disciplinarService.zerarContagem(this.assistidoId(), {
        motivo: this.motivo().trim(),
        nivel: this.nivelEscolhido(),
      });
      this.zerado.emit(ficha);
      this.fechar();
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível zerar a contagem. Tente novamente.'));
    } finally {
      this.salvando.set(false);
    }
  }

  private limpar(): void {
    this.escopo.set('TODOS');
    this.motivo.set('');
    this.ciente.set(false);
    this.erro.set(null);
  }
}
