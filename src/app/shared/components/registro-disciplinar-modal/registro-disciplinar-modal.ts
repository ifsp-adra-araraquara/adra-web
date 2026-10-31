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
} from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { DisciplinarService } from '../../../core/disciplinar.service';
import { NIVEIS_DISCIPLINARES, NivelDisciplinar, ORDEM_NIVEIS } from '../../enum/NivelDisciplinar';
import { MotivoDisciplinarDTO, RegistroDisciplinarDTO } from '../../models/disciplinar/Disciplinar';
import { Role } from '../../enum/role.enum';
import { AssistidoResponseDTO } from '../../models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../models/PaginaResponse';
import { hojeISO } from '../../utils/aula.util';
import { dataBr, rotuloSequencia } from '../../utils/disciplinar.util';
import { mensagemErro } from '../../utils/erro-http.util';
import { Modal } from '../modal/modal';
import { Button } from '../button/button';
import { Input } from '../input/input';
import { Icon } from '../icon/icon';
import { Badge } from '../badge/badge';
import { Avatar } from '../avatar/avatar';
import { calcularIdade } from '../../utils/idade.util';

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
 * Modal de registro disciplinar (FT-04). Reaproveitado na tela Disciplinar,
 * na ficha do assistido e na chamada — quando o assistido (e a aula) já são
 * conhecidos, vêm por input e a busca some.
 *
 * Depois de salvar, mostra o que aconteceu (inclusive a progressão:
 * "a 3ª ocorrência gerou uma advertência") e oferece imprimir o documento.
 */
@Component({
  selector: 'app-registro-disciplinar-modal',
  imports: [FormsModule, Modal, Button, Input, Icon, Badge, Avatar],
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
  salvo = output<RegistroDisciplinarDTO[]>();

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
  readonly assistidoEscolhido = signal<AssistidoSelecionado | null>(null);
  private buscaTimer: ReturnType<typeof setTimeout> | null = null;

  // Formulário
  readonly motivoId = signal<number | null>(null);
  readonly data = signal(this.hoje);
  readonly descricao = signal('');
  readonly suspensaoInicio = signal(this.hoje);
  readonly suspensaoFim = signal(this.somarDias(this.hoje, DIAS_SUSPENSAO_PADRAO - 1));

  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroMotivo = signal<string | null>(null);
  readonly erroData = signal<string | null>(null);
  readonly erroDescricao = signal<string | null>(null);
  readonly erroSuspensao = signal<string | null>(null);
  readonly resultado = signal<RegistroDisciplinarDTO[] | null>(null);

  readonly assistidoAtual = computed(() => this.assistido() ?? this.assistidoEscolhido());
  readonly motivoSelecionado = computed(() => this.motivos().find((m) => m.motivoId === this.motivoId()) ?? null);
  readonly nivelSelecionado = computed(() => this.motivoSelecionado()?.nivel ?? null);
  readonly ehSuspensao = computed(() => this.nivelSelecionado() === NivelDisciplinar.SUSPENSAO);

  /** O registro lançado (1º) e os gerados pela progressão (demais). */
  readonly registroPrincipal = computed(() => this.resultado()?.[0] ?? null);
  readonly gerados = computed(() => this.resultado()?.slice(1) ?? []);
  readonly comDocumento = computed(() => (this.resultado() ?? []).filter((r) => r.documentoStatus !== null));

  constructor() {
    // Sempre que abre: limpa o estado e carrega os motivos ativos.
    effect(() => {
      if (this.open()) {
        this.reiniciar();
        this.carregarMotivos();
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
    this.assistidoEscolhido.set(a);
    this.resultadosBusca.set([]);
    this.termoBusca.set('');
  }

  trocarAssistido(): void {
    this.assistidoEscolhido.set(null);
  }

  descricaoAssistido(a: AssistidoSelecionado): string {
    const partes = [a.idade != null ? `${a.idade} anos` : null, a.nomeTurma || 'Sem turma'];
    return partes.filter(Boolean).join(' · ');
  }

  onData(valor: string): void {
    this.data.set(valor);
    // Acompanha a data do fato enquanto a pessoa não mexeu no período.
    this.suspensaoInicio.set(valor);
    this.suspensaoFim.set(this.somarDias(valor, DIAS_SUSPENSAO_PADRAO - 1));
  }

  async registrar(): Promise<void> {
    const assistido = this.assistidoAtual();
    if (!assistido) {
      this.erro.set('Escolha o assistido.');
      return;
    }
    if (!this.validar()) {
      this.erro.set(null);
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    try {
      const criados = await this.disciplinarService.registrar(assistido.assistidoId, {
        motivoId: this.motivoId()!,
        data: this.data(),
        descricao: this.descricao().trim(),
        aulaId: this.aulaId(),
        suspensaoInicio: this.ehSuspensao() ? this.suspensaoInicio() : null,
        suspensaoFim: this.ehSuspensao() ? this.suspensaoFim() : null,
      });
      this.resultado.set(criados);
      this.salvo.emit(criados);
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível registrar. Tente novamente.'));
    } finally {
      this.salvando.set(false);
    }
  }

  /** "Registrar outro" mantém o assistido escolhido (vários fatos do mesmo aluno). */
  registrarOutro(): void {
    const escolhido = this.assistidoEscolhido();
    this.reiniciar();
    this.assistidoEscolhido.set(escolhido);
  }

  imprimir(registro: RegistroDisciplinarDTO): void {
    this.fechar();
    this.router.navigate(['/disciplinar/documento', registro.registroId]);
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
      !this.ehSuspensao()
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
    this.assistidoEscolhido.set(null);
    this.termoBusca.set('');
    this.resultadosBusca.set([]);
    this.motivoId.set(null);
    this.data.set(this.hoje);
    this.descricao.set('');
    this.suspensaoInicio.set(this.hoje);
    this.suspensaoFim.set(this.somarDias(this.hoje, DIAS_SUSPENSAO_PADRAO - 1));
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

  private somarDias(iso: string, dias: number): string {
    const [a, m, d] = iso.split('-').map(Number);
    const data = new Date(a, m - 1, d + dias);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }
}
