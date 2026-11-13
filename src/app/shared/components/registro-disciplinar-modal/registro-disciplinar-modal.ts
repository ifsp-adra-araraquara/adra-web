import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { DisciplinarService } from '../../../core/disciplinar.service';
import { NIVEIS_DISCIPLINARES, NivelDisciplinar, ORDEM_NIVEIS } from '../../enum/NivelDisciplinar';
import { RegistroCriadoDTO, RegistroDisciplinarDTO } from '../../models/disciplinar/Disciplinar';
import { Role } from '../../enum/role.enum';
import { hojeISO } from '../../utils/aula.util';
import { dataBr, previaRegistro, rotuloSequencia, somarDias } from '../../utils/disciplinar.util';
import { mensagemErro } from '../../utils/erro-http.util';
import { nomeCurto } from '../../utils/nome.util';
import { Modal } from '../modal/modal';
import { Button } from '../button/button';
import { Input } from '../input/input';
import { Icon } from '../icon/icon';
import { Avatar } from '../avatar/avatar';
import { RecomendacaoDisciplinarModal } from '../recomendacao-disciplinar-modal/recomendacao-disciplinar-modal';
import { AtendidoEscolhido, SeletorAtendidos } from '../seletor-atendidos/seletor-atendidos';

const DIAS_SUSPENSAO_PADRAO = 3;
export const MAX_MOTIVO = 200;
/** A partir daqui "quem" e "o quê" ficam lado a lado; abaixo, viram dois passos. */
const MIDIA_LARGA = '(min-width: 768px)';

type Passo = 'quem' | 'oque';

/**
 * Registro rápido de ocorrência (FT-04/FT-22). Sem atendido por input, abre
 * a bandeja "Quem está envolvido?" (grade de rostos, um ou mais) ao lado de
 * "O que aconteceu?"; no celular, os dois viram passos. Com atendido por
 * input (ficha/chamada), é só o formulário.
 *
 * Antes de salvar, a prévia mostra qual será o registro de cada atendido e
 * se a Cartilha vai recomendar o próximo nível. Depois de salvar, mostra a
 * confirmação, oferece imprimir os documentos e abre o modal de recomendação.
 */
@Component({
  selector: 'app-registro-disciplinar-modal',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    Modal,
    Button,
    Input,
    Icon,
    Avatar,
    RecomendacaoDisciplinarModal,
    SeletorAtendidos,
  ],
  templateUrl: './registro-disciplinar-modal.html',
  styleUrl: './registro-disciplinar-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroDisciplinarModal {
  private readonly router = inject(Router);
  private readonly disciplinarService = inject(DisciplinarService);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  open = model(false);
  /** Quando informado, o modal já abre com o atendido escolhido (ficha/chamada). */
  assistido = input<AtendidoEscolhido | null>(null);
  /** Grupo em que aconteceu, quando registrado pela chamada. */
  turmaId = input<number | null>(null);
  salvo = output<RegistroCriadoDTO[]>();

  readonly NIVEIS = NIVEIS_DISCIPLINARES;
  readonly dataBr = dataBr;
  readonly nomeCurto = nomeCurto;
  readonly hoje = hojeISO();
  readonly ontem = somarDias(this.hoje, -1);

  readonly MAX_MOTIVO = MAX_MOTIVO;
  readonly ehCoordenador = computed(() => this.auth.currentProfile() === Role.COORD);
  private readonly niveisPermitidos = computed(() =>
    this.auth.currentProfile() === Role.EDUCADOR
      ? [NivelDisciplinar.OCORRENCIA]
      : ORDEM_NIVEIS.filter((n) => n !== NivelDisciplinar.UNIFORME),
  );
  /** E-mail da ADRA de 11/11: só ocorrência, advertência e suspensão; o motivo é escrito. */
  readonly opcoesNivel = computed(() =>
    this.niveisPermitidos().map((nivel) => ({
      nivel,
      rotulo: NIVEIS_DISCIPLINARES[nivel].rotulo,
      variant: NIVEIS_DISCIPLINARES[nivel].variant,
    })),
  );

  /** Tela larga (iPad, notebook, PC): bandeja e formulário lado a lado. */
  readonly largo = signal(false);
  readonly passo = signal<Passo>('quem');
  readonly escolhidos = signal<AtendidoEscolhido[]>([]);

  // Formulário
  readonly nivel = signal<NivelDisciplinar | null>(null);
  readonly motivo = signal('');
  readonly data = signal(this.hoje);
  readonly outraData = signal(false);
  readonly descricao = signal('');
  readonly suspensaoInicio = signal(this.hoje);
  readonly suspensaoFim = signal(somarDias(this.hoje, DIAS_SUSPENSAO_PADRAO - 1));

  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroNivel = signal<string | null>(null);
  readonly erroMotivo = signal<string | null>(null);
  readonly erroData = signal<string | null>(null);
  readonly erroDescricao = signal<string | null>(null);
  readonly erroSuspensao = signal<string | null>(null);
  readonly resultado = signal<RegistroCriadoDTO[] | null>(null);

  /** Sem atendido por input: mostra a bandeja de rostos. */
  readonly comBandeja = computed(() => !this.assistido());
  readonly tamanho = computed(() => (this.comBandeja() && !this.resultado() ? 'xl' : 'md'));
  readonly assistidosAtuais = computed(() => {
    const doInput = this.assistido();
    return doInput ? [doInput] : this.escolhidos();
  });
  readonly varios = computed(() => this.assistidosAtuais().length > 1);
  readonly mostraQuem = computed(() => this.largo() || this.passo() === 'quem');
  readonly mostraOque = computed(() => this.largo() || this.passo() === 'oque');
  readonly rotuloRegistrar = computed(() =>
    this.varios() ? `Registrar para ${this.assistidosAtuais().length} atendidos` : 'Registrar',
  );

  readonly nivelSelecionado = computed(() => this.nivel());
  readonly ehSuspensao = computed(() => this.nivelSelecionado() === NivelDisciplinar.SUSPENSAO);

  /** O que cada atendido vai receber, antes de salvar. */
  readonly previa = computed(() => {
    const nivel = this.nivelSelecionado();
    if (!nivel) return [];
    return this.assistidosAtuais().map((atendido) => {
      const { sequencia, recomendacao } = previaRegistro(nivel, atendido);
      const registro = sequencia ? rotuloSequencia({ sequencia, nivel }) : NIVEIS_DISCIPLINARES[nivel].rotulo;
      return { atendido, registro, recomendacao };
    });
  });
  readonly previaTemRecomendacao = computed(() => this.previa().some((p) => p.recomendacao));

  readonly registrados = computed(() => (this.resultado() ?? []).map((c) => c.registro));
  readonly comDocumento = computed(() => this.registrados().filter((r) => r.documentoStatus !== null));
  // Só a coordenação decide a recomendação (advertência em diante); o Educador só vê o aviso na prévia.
  readonly recomendacoes = computed(() =>
    !this.ehCoordenador() ? [] : (this.resultado() ?? []).flatMap((c) => (c.recomendacao ? [c.recomendacao] : [])),
  );
  readonly confirmacao = computed(() => {
    const registros = this.registrados();
    if (registros.length === 0) return '';
    const nivel = registros[0].nivel;
    const oQue = nivel === NivelDisciplinar.UNIFORME ? 'Ocorrência de uniforme' : NIVEIS_DISCIPLINARES[nivel].rotulo;
    const texto = `${oQue} registrada para ${listarNomes(registros.map((r) => nomeCurto(r.nomeAssistido)))}`;
    return texto.endsWith('.') ? texto : `${texto}.`; // "Ana S." já termina em ponto
  });

  private readonly tituloOque = viewChild<ElementRef<HTMLElement>>('tituloOque');

  /** Retorno às atividades do período sugerido pela API (dias de atividade do grupo), para a dica do formulário. */
  readonly retornoSuspensao = signal<string | null>(null);
  private pedidoPeriodo = 0;

  /**
   * Suspensão conta dias de atividade do grupo (reunião de 05/11): pede à API o período
   * a partir da data do fato. Se falhar, fica o padrão local; o back aplica a regra de todo jeito.
   */
  private async sugerirPeriodo(assistidoId: number, data: string): Promise<void> {
    const pedido = ++this.pedidoPeriodo;
    try {
      const periodo = await this.disciplinarService.sugerirPeriodoSuspensao(assistidoId, data);
      if (pedido !== this.pedidoPeriodo) return;
      this.suspensaoInicio.set(periodo.inicio);
      this.suspensaoFim.set(periodo.fim);
      this.retornoSuspensao.set(periodo.retorno);
    } catch {
      if (pedido === this.pedidoPeriodo) this.retornoSuspensao.set(null);
    }
  }

  constructor() {
    // Sempre que abre: limpa o estado.
    effect(() => {
      if (this.open()) {
        untracked(() => this.reiniciar());
      }
    });

    // Suspensão com um atendido: o período vem em dias de atividade do grupo dele.
    effect(() => {
      const atendidos = this.assistidosAtuais();
      if (!this.ehSuspensao() || atendidos.length !== 1) return;
      const assistidoId = atendidos[0].assistidoId;
      const data = this.data();
      untracked(() => this.sugerirPeriodo(assistidoId, data));
    });

    const midia = this.document.defaultView?.matchMedia?.(MIDIA_LARGA);
    if (midia) {
      this.largo.set(midia.matches);
      const aoMudar = (e: MediaQueryListEvent) => this.largo.set(e.matches);
      midia.addEventListener('change', aoMudar);
      this.destroyRef.onDestroy(() => midia.removeEventListener('change', aoMudar));
    }
  }

  removerAssistido(a: AtendidoEscolhido): void {
    this.escolhidos.update((lista) => lista.filter((e) => e.assistidoId !== a.assistidoId));
  }

  /** Celular: do passo "quem" para "o quê". */
  continuar(): void {
    if (this.escolhidos().length === 0) {
      this.erro.set('Escolha ao menos um atendido.');
      return;
    }
    this.erro.set(null);
    this.passo.set('oque');
    setTimeout(() => this.tituloOque()?.nativeElement.focus());
  }

  voltar(): void {
    this.erro.set(null);
    this.passo.set('quem');
  }

  escolherData(valor: string): void {
    this.outraData.set(false);
    this.onData(valor);
  }

  onData(valor: string): void {
    this.data.set(valor);
    // Acompanha a data do fato enquanto a pessoa não mexeu no período.
    this.suspensaoInicio.set(valor);
    this.suspensaoFim.set(somarDias(valor, DIAS_SUSPENSAO_PADRAO - 1));
  }

  async registrar(): Promise<void> {
    const atendidos = this.assistidosAtuais();
    if (atendidos.length === 0) {
      this.erro.set('Escolha ao menos um atendido.');
      return;
    }
    if (!this.validar()) {
      this.erro.set(null);
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    try {
      const criados = this.varios()
        ? await this.disciplinarService.registrarVarios({
            assistidoIds: atendidos.map((a) => a.assistidoId),
            nivel: this.nivel()!,
            motivo: this.motivo().trim(),
            data: this.data(),
            descricao: this.descricao().trim(),
          })
        : [
            await this.disciplinarService.registrar(atendidos[0].assistidoId, {
              nivel: this.nivel()!,
              motivo: this.motivo().trim(),
              data: this.data(),
              descricao: this.descricao().trim(),
              turmaId: this.turmaId(),
              suspensaoInicio: this.ehSuspensao() ? this.suspensaoInicio() : null,
              suspensaoFim: this.ehSuspensao() ? this.suspensaoFim() : null,
            }),
          ];
      this.resultado.set(criados);
      this.salvo.emit(criados);
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível registrar. Tente novamente.'));
    } finally {
      this.salvando.set(false);
    }
  }

  /** "Registrar outra" mantém os atendidos escolhidos (vários fatos dos mesmos atendidos). */
  registrarOutra(): void {
    const escolhidos = this.escolhidos();
    this.reiniciar();
    this.escolhidos.set(escolhidos);
    if (escolhidos.length > 0) this.passo.set('oque');
  }

  imprimir(registro: RegistroDisciplinarDTO): void {
    this.fechar();
    this.router.navigate(['/disciplinar/documento', registro.registroId]);
  }

  /** A advertência/suspensão gerada pelo modal de recomendação também conta como salvo (a tela recarrega). */
  aoGerarPelaRecomendacao(criado: RegistroCriadoDTO): void {
    this.salvo.emit([criado]);
  }

  fechar(): void {
    this.open.set(false);
  }

  rotuloSequencia(r: RegistroDisciplinarDTO): string {
    return rotuloSequencia(r);
  }

  // Popula um erro por campo (mostrado embaixo dele) em vez de só um aviso genérico no topo.
  private validar(): boolean {
    this.erroNivel.set(!this.nivel() ? 'Escolha ocorrência, advertência ou suspensão.' : null);
    this.erroMotivo.set(
      !this.motivo().trim()
        ? 'Escreva o motivo.'
        : this.motivo().trim().length > MAX_MOTIVO
          ? `O motivo tem no máximo ${MAX_MOTIVO} caracteres.`
          : null,
    );
    this.erroData.set(
      !this.data() ? 'Informe a data.' : this.data() > this.hoje ? 'A data não pode ser no futuro.' : null,
    );
    this.erroDescricao.set(!this.descricao().trim() ? 'Descreva o que aconteceu.' : null);
    this.erroSuspensao.set(
      !this.ehSuspensao() || this.varios()
        ? null
        : !this.suspensaoInicio() || !this.suspensaoFim()
          ? 'Informe o período da suspensão.'
          : this.suspensaoFim() < this.suspensaoInicio()
            ? 'O fim da suspensão não pode ser antes do início.'
            : null,
    );
    return !this.erroNivel() && !this.erroMotivo() && !this.erroData() && !this.erroDescricao() && !this.erroSuspensao();
  }

  private reiniciar(): void {
    this.retornoSuspensao.set(null);
    this.passo.set('quem');
    this.escolhidos.set([]);
    this.nivel.set(null);
    this.motivo.set('');
    this.data.set(this.hoje);
    this.outraData.set(false);
    this.descricao.set('');
    this.suspensaoInicio.set(this.hoje);
    this.suspensaoFim.set(somarDias(this.hoje, DIAS_SUSPENSAO_PADRAO - 1));
    this.erro.set(null);
    this.erroNivel.set(null);
    this.erroMotivo.set(null);
    this.erroData.set(null);
    this.erroDescricao.set(null);
    this.erroSuspensao.set(null);
    this.resultado.set(null);
  }

}

/** ["Lucas M.", "Pedro H.", "Ana S."] → "Lucas M., Pedro H. e Ana S." */
function listarNomes(nomes: string[]): string {
  return nomes.length <= 1 ? (nomes[0] ?? '') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}
