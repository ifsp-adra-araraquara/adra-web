import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { DisciplinarService } from '../../../core/disciplinar.service';
import { NIVEIS_DISCIPLINARES, NivelDisciplinar } from '../../enum/NivelDisciplinar';
import { Role } from '../../enum/role.enum';
import { RegistroCriadoDTO, RegistroDisciplinarDTO } from '../../models/disciplinar/Disciplinar';
import { hojeISO } from '../../utils/aula.util';
import { nivelRecomendado, rotuloSequencia, somarDias, textoRecomendacao } from '../../utils/disciplinar.util';
import { mensagemErro } from '../../utils/erro-http.util';
import { Modal } from '../modal/modal';
import { Button } from '../button/button';
import { Input } from '../input/input';
import { Icon } from '../icon/icon';

const DIAS_SUSPENSAO_PADRAO = 3;

/**
 * FT-22: avisa que um atendido chegou a 3 do nível e o que a Cartilha
 * recomenda. Um modal por recomendação, em fila. O Coordenador gera o
 * registro recomendado ou deixa para depois ("Agora não" mantém pendente);
 * os outros perfis só tomam ciência.
 */
@Component({
  selector: 'app-recomendacao-disciplinar-modal',
  imports: [FormsModule, Modal, Button, Input, Icon],
  templateUrl: './recomendacao-disciplinar-modal.html',
  styleUrl: './recomendacao-disciplinar-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecomendacaoDisciplinarModal {
  private readonly disciplinarService = inject(DisciplinarService);
  private readonly auth = inject(AuthService);

  /** Registros com recomendação pendente; cada mudança reinicia a fila. */
  recomendacoes = input<RegistroDisciplinarDTO[]>([]);
  gerado = output<RegistroCriadoDTO>();

  readonly hoje = hojeISO();
  readonly NIVEIS = NIVEIS_DISCIPLINARES;

  private readonly fila = signal<RegistroDisciplinarDTO[]>([]);
  /** Lista de 0 ou 1 item, para o `@for` recriar o modal a cada recomendação. */
  readonly atual = computed(() => this.fila().slice(0, 1));
  readonly restantes = computed(() => Math.max(this.fila().length - 1, 0));

  readonly ehCoordenador = computed(() => this.auth.currentProfile() === Role.COORD);
  readonly nivelAGerar = computed(() => nivelRecomendado(this.fila()[0]?.consequencia ?? null));
  readonly podeGerar = computed(() => this.ehCoordenador() && this.nivelAGerar() !== null);
  readonly ehSuspensao = computed(() => this.nivelAGerar() === NivelDisciplinar.SUSPENSAO);

  readonly formAberto = signal(false);
  readonly data = signal(this.hoje);
  readonly descricao = signal('');
  readonly suspensaoInicio = signal(this.hoje);
  readonly suspensaoFim = signal(somarDias(this.hoje, DIAS_SUSPENSAO_PADRAO - 1));
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroCampos = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.fila.set(this.recomendacoes());
      this.reiniciarFormulario();
    });
  }

  readonly texto = textoRecomendacao;

  rotuloGerar(): string {
    const nivel = this.nivelAGerar();
    return nivel ? NIVEIS_DISCIPLINARES[nivel].rotulo.toLowerCase() : '';
  }

  abrirFormulario(r: RegistroDisciplinarDTO): void {
    this.descricao.set(`${NIVEIS_DISCIPLINARES[this.nivelAGerar()!].rotulo} pela ${rotuloSequencia(r)} registrada.`);
    this.formAberto.set(true);
  }

  onData(valor: string): void {
    this.data.set(valor);
    this.suspensaoInicio.set(valor);
    this.suspensaoFim.set(somarDias(valor, DIAS_SUSPENSAO_PADRAO - 1));
  }

  async gerar(r: RegistroDisciplinarDTO): Promise<void> {
    if (!this.validar()) return;
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const criado = await this.disciplinarService.gerarPelaRecomendacao(r.registroId, {
        data: this.data(),
        descricao: this.descricao().trim(),
        suspensaoInicio: this.ehSuspensao() ? this.suspensaoInicio() : null,
        suspensaoFim: this.ehSuspensao() ? this.suspensaoFim() : null,
      });
      this.gerado.emit(criado);
      const nova = criado.recomendacao;
      if (nova && !this.fila().some((f) => f.registroId === nova.registroId)) {
        this.fila.update((f) => [...f, nova]);
      }
      this.proxima();
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível gerar. Tente novamente.'));
    } finally {
      this.salvando.set(false);
    }
  }

  proxima(): void {
    this.fila.update((f) => f.slice(1));
    this.reiniciarFormulario();
  }

  private validar(): boolean {
    const erro = !this.data()
      ? 'Informe a data.'
      : this.data() > this.hoje
        ? 'A data não pode ser no futuro.'
        : !this.descricao().trim()
          ? 'Descreva o registro.'
          : this.ehSuspensao() && this.suspensaoFim() < this.suspensaoInicio()
            ? 'O fim da suspensão não pode ser antes do início.'
            : null;
    this.erroCampos.set(erro);
    return !erro;
  }

  private reiniciarFormulario(): void {
    this.formAberto.set(false);
    this.data.set(this.hoje);
    this.descricao.set('');
    this.suspensaoInicio.set(this.hoje);
    this.suspensaoFim.set(somarDias(this.hoje, DIAS_SUSPENSAO_PADRAO - 1));
    this.erro.set(null);
    this.erroCampos.set(null);
  }
}
