import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { DisciplinarService } from '../../../core/disciplinar.service';
import { NIVEIS_DISCIPLINARES, NivelDisciplinar, ORDEM_NIVEIS } from '../../enum/NivelDisciplinar';
import {
  MotivoDisciplinarDTO,
  RegistroCriadoDTO,
  RegistroDisciplinarDTO,
} from '../../models/disciplinar/Disciplinar';
import { Role } from '../../enum/role.enum';
import { AssistidoResponseDTO } from '../../models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../models/PaginaResponse';
import { hojeISO } from '../../utils/aula.util';
import { dataBr, rotuloSequencia, somarDias } from '../../utils/disciplinar.util';
import { mensagemErro } from '../../utils/erro-http.util';
import { Modal } from '../modal/modal';
import { Button } from '../button/button';
import { Input } from '../input/input';
import { Icon } from '../icon/icon';
import { Badge } from '../badge/badge';
import { Avatar } from '../avatar/avatar';
import { calcularIdade } from '../../utils/idade.util';
import { RecomendacaoDisciplinarModal } from '../recomendacao-disciplinar-modal/recomendacao-disciplinar-modal';

export interface AssistidoSelecionado {
  assistidoId: number;
  nomeCompleto: string;
  /** Só para exibir na lista de escolha ("11 anos · Turma A"). */
  idade?: number | null;
  nomeTurma?: string | null;
}

/** Quantos assistidos a busca mostra. */
const TAMANHO_LISTA = 5;

const DIAS_SUSPENSAO_PADRAO = 3;

/**
 * Modal de registro disciplinar (FT-04/FT-22). Quando o atendido (e a aula)
 * já são conhecidos, vêm por input e a busca some; sem input, a busca permite
 * escolher vários atendidos para o mesmo fato (um registro por atendido).
 *
 * Depois de salvar, mostra o que foi registrado, oferece imprimir o documento
 * e abre o modal de recomendação para cada atendido que chegou a 3 do nível.
 */
@Component({
  selector: 'app-registro-disciplinar-modal',
  imports: [FormsModule, Modal, Button, Input, Icon, Badge, Avatar, RecomendacaoDisciplinarModal],
  templateUrl: './registro-disciplinar-modal.html',
  styleUrl: './registro-disciplinar-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroDisciplinarModal {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly disciplinarService = inject(DisciplinarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  open = model(false);
  /** Quando informado, o modal já abre com o assistido escolhido (ficha/chamada). */
  assistido = input<AssistidoSelecionado | null>(null);
  /** Aula em que aconteceu, quando registrado pela chamada. */
  aulaId = input<number | null>(null);
  salvo = output<RegistroCriadoDTO[]>();

  readonly NIVEIS = NIVEIS_DISCIPLINARES;
  readonly dataBr = dataBr;
  readonly hoje = hojeISO();

  readonly motivos = signal<MotivoDisciplinarDTO[]>([]);
  private readonly niveisPermitidos = computed(() =>
    this.auth.currentProfile() === Role.EDUCADOR ? [NivelDisciplinar.OCORRENCIA] : ORDEM_NIVEIS,
  );
  readonly gruposMotivos = computed(() =>
    this.niveisPermitidos().map((nivel) => ({
      nivel,
      rotulo: NIVEIS_DISCIPLINARES[nivel].rotulo,
      motivos: this.motivos().filter((m) => m.nivel === nivel),
    })).filter((g) => g.motivos.length > 0),
  );

  // Busca de assistido (quando não vem por input)
  readonly termoBusca = signal('');
  readonly resultadosBusca = signal<AssistidoSelecionado[]>([]);
  readonly buscando = signal(false);
  readonly escolhidos = signal<AssistidoSelecionado[]>([]);
  private buscaTimer: ReturnType<typeof setTimeout> | null = null;

  // Formulário
  readonly motivoId = signal<number | null>(null);
  readonly data = signal(this.hoje);
  readonly descricao = signal('');
  readonly suspensaoInicio = signal(this.hoje);
  readonly suspensaoFim = signal(somarDias(this.hoje, DIAS_SUSPENSAO_PADRAO - 1));

  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroMotivo = signal<string | null>(null);
  readonly erroData = signal<string | null>(null);
  readonly erroDescricao = signal<string | null>(null);
  readonly erroSuspensao = signal<string | null>(null);
  readonly resultado = signal<RegistroCriadoDTO[] | null>(null);

  readonly assistidosAtuais = computed(() => {
    const doInput = this.assistido();
    return doInput ? [doInput] : this.escolhidos();
  });
  readonly varios = computed(() => this.assistidosAtuais().length > 1);
  readonly subtitulo = computed(() => {
    const atuais = this.assistidosAtuais();
    return atuais.length === 1 ? atuais[0].nomeCompleto : atuais.length > 1 ? `${atuais.length} atendidos` : '';
  });
  readonly motivoSelecionado = computed(() => this.motivos().find((m) => m.motivoId === this.motivoId()) ?? null);
  readonly nivelSelecionado = computed(() => this.motivoSelecionado()?.nivel ?? null);
  readonly ehSuspensao = computed(() => this.nivelSelecionado() === NivelDisciplinar.SUSPENSAO);

  readonly registrados = computed(() => (this.resultado() ?? []).map((c) => c.registro));
  readonly comDocumento = computed(() => this.registrados().filter((r) => r.documentoStatus !== null));
  readonly recomendacoes = computed(() =>
    (this.resultado() ?? []).flatMap((c) => (c.recomendacao ? [c.recomendacao] : [])),
  );

  constructor() {
    // Sempre que abre: limpa o estado e carrega os motivos ativos.
    effect(() => {
      if (this.open()) {
        // untracked: a chegada dos motivos não pode reabrir (e limpar) o formulário.
        untracked(() => {
          this.reiniciar();
          this.carregarMotivos();
        });
      }
    });
    this.destroyRef.onDestroy(() => this.buscaTimer && clearTimeout(this.buscaTimer));
  }

  onBusca(termo: string): void {
    this.termoBusca.set(termo);
    if (this.buscaTimer) clearTimeout(this.buscaTimer);
    // A lista só aparece depois que a pessoa começa a digitar.
    const busca = termo.trim();
    if (!busca) {
      this.resultadosBusca.set([]);
      this.buscando.set(false);
      return;
    }
    this.buscando.set(true); // evita piscar "nenhum encontrado" antes da busca começar
    this.buscaTimer = setTimeout(() => this.buscarAssistidos(busca), 300);
  }

  escolherAssistido(a: AssistidoSelecionado): void {
    if (!this.estaEscolhido(a)) this.escolhidos.update((lista) => [...lista, a]);
    this.resultadosBusca.set([]);
    this.termoBusca.set('');
  }

  removerAssistido(a: AssistidoSelecionado): void {
    this.escolhidos.update((lista) => lista.filter((e) => e.assistidoId !== a.assistidoId));
  }

  estaEscolhido(a: AssistidoSelecionado): boolean {
    return this.escolhidos().some((e) => e.assistidoId === a.assistidoId);
  }

  descricaoAssistido(a: AssistidoSelecionado): string {
    const partes = [a.idade != null ? `${a.idade} anos` : null, a.nomeTurma || 'Sem turma'];
    return partes.filter(Boolean).join(' · ');
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
            motivoId: this.motivoId()!,
            data: this.data(),
            descricao: this.descricao().trim(),
          })
        : [
            await this.disciplinarService.registrar(atendidos[0].assistidoId, {
              motivoId: this.motivoId()!,
              data: this.data(),
              descricao: this.descricao().trim(),
              aulaId: this.aulaId(),
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

  /** "Registrar outro" mantém os atendidos escolhidos (vários fatos dos mesmos atendidos). */
  registrarOutro(): void {
    const escolhidos = this.escolhidos();
    this.reiniciar();
    this.escolhidos.set(escolhidos);
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
    this.erroMotivo.set(!this.motivoId() ? 'Escolha o motivo.' : null);
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
    return !this.erroMotivo() && !this.erroData() && !this.erroDescricao() && !this.erroSuspensao();
  }

  private reiniciar(): void {
    this.escolhidos.set([]);
    this.termoBusca.set('');
    this.resultadosBusca.set([]);
    this.motivoId.set(null);
    this.data.set(this.hoje);
    this.descricao.set('');
    this.suspensaoInicio.set(this.hoje);
    this.suspensaoFim.set(somarDias(this.hoje, DIAS_SUSPENSAO_PADRAO - 1));
    this.erro.set(null);
    this.erroMotivo.set(null);
    this.erroData.set(null);
    this.erroDescricao.set(null);
    this.erroSuspensao.set(null);
    this.resultado.set(null);
  }

  private async carregarMotivos(): Promise<void> {
    if (this.motivos().length > 0) return;
    try {
      this.motivos.set(await this.disciplinarService.listarMotivos());
    } catch {
      this.erro.set('Não foi possível carregar os motivos.');
    }
  }

  private async buscarAssistidos(termo: string): Promise<void> {
    this.buscando.set(true);
    try {
      const params = new HttpParams().set('busca', termo).set('status', 'ATIVO').set('tamanho', TAMANHO_LISTA);
      const pagina = await firstValueFrom(
        this.http.get<PaginaResponse<AssistidoResponseDTO>>(`${environment.apiUrl}/api/assistidos`, { params }),
      );
      if (termo !== this.termoBusca().trim()) return; // a pessoa continuou digitando
      this.resultadosBusca.set(
        pagina.conteudo.map((a) => ({
          assistidoId: a.assistidoId,
          nomeCompleto: a.nomeCompleto,
          idade: calcularIdade(a.dataNascimento),
          nomeTurma: a.nomeTurma ?? null,
        })),
      );
    } catch {
      this.resultadosBusca.set([]);
    } finally {
      this.buscando.set(false);
    }
  }
}
