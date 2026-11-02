import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AssistidoResponseDTO } from '../../models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../models/PaginaResponse';
import { TurmaResponseDTO } from '../../models/turma/TurmaResponseDTO';
import { ContadoresDisciplinares } from '../../utils/disciplinar.util';
import { calcularIdade } from '../../utils/idade.util';
import { nomeCurto } from '../../utils/nome.util';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';

export interface AtendidoEscolhido extends ContadoresDisciplinares {
  assistidoId: number;
  nomeCompleto: string;
  idade?: number | null;
  nomeTurma?: string | null;
}

const TAMANHO_PAGINA = 24;
/** Grupo usado por último — conveniência por pessoa, sem dado sensível. */
const CHAVE_GRUPO = 'adra.registro-rapido.grupo';

/**
 * "Quem está envolvido?": grade de rostos dos atendidos ativos para escolher
 * um ou mais, com filtro por grupo (turma) e busca pelo nome. Carrega uma
 * página por vez e a próxima ao chegar no fim. A escolha continua valendo ao
 * trocar de grupo ou de busca.
 */
@Component({
  selector: 'app-seletor-atendidos',
  imports: [Avatar, Icon],
  templateUrl: './seletor-atendidos.html',
  styleUrl: './seletor-atendidos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeletorAtendidos implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  escolhidos = model<AtendidoEscolhido[]>([]);

  readonly nomeCurto = nomeCurto;
  readonly esqueleto = Array.from({ length: 12 }, (_, i) => i);

  readonly grupos = signal<TurmaResponseDTO[]>([]);
  readonly grupoId = signal<number | null>(null);
  readonly termo = signal('');
  readonly itens = signal<AtendidoEscolhido[]>([]);
  readonly total = signal(0);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  private readonly pagina = signal(0);
  private readonly totalPaginas = signal(0);

  readonly temMais = computed(() => this.pagina() < this.totalPaginas() - 1);
  readonly nomeGrupo = computed(() => this.grupos().find((g) => g.turmaId === this.grupoId())?.nomeTurma ?? null);
  readonly anuncio = computed(() => {
    const n = this.escolhidos().length;
    return n === 0 ? '' : n === 1 ? '1 atendido escolhido' : `${n} atendidos escolhidos`;
  });

  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');
  private readonly fimDaLista = viewChild<ElementRef<HTMLElement>>('fimDaLista');
  private buscaTimer: ReturnType<typeof setTimeout> | null = null;
  private requisicao = 0;

  constructor() {
    // No PC a busca já abre com foco; no toque, não (o teclado abriria sozinho).
    afterNextRender(() => {
      if (this.document.defaultView?.matchMedia?.('(pointer: fine)').matches) {
        this.campoBusca()?.nativeElement.focus();
      }
    });

    // Chegou no fim da lista: carrega a próxima página.
    effect((onCleanup) => {
      const fim = this.fimDaLista()?.nativeElement;
      const Observer = this.document.defaultView?.IntersectionObserver;
      if (!fim || !Observer) return;
      const observer = new Observer((entradas) => {
        if (entradas.some((e) => e.isIntersecting)) this.carregarMais();
      });
      observer.observe(fim);
      onCleanup(() => observer.disconnect());
    });

    this.destroyRef.onDestroy(() => this.buscaTimer && clearTimeout(this.buscaTimer));
  }

  ngOnInit(): void {
    this.grupoId.set(this.lerGrupoLembrado());
    this.carregarGrupos();
    this.carregar(0);
  }

  onBusca(evento: Event): void {
    this.termo.set((evento.target as HTMLInputElement).value);
    if (this.buscaTimer) clearTimeout(this.buscaTimer);
    this.buscaTimer = setTimeout(() => this.carregar(0), 300);
  }

  /** Enter na busca marca o primeiro resultado e limpa a busca (rápido no PC). */
  escolherPrimeiro(evento: Event): void {
    evento.preventDefault();
    const primeiro = this.itens()[0];
    if (!primeiro || this.carregando() || !this.termo().trim()) return;
    if (!this.estaEscolhido(primeiro)) this.alternar(primeiro);
    this.termo.set('');
    this.carregar(0);
  }

  filtrarGrupo(grupoId: number | null): void {
    this.grupoId.set(grupoId);
    this.lembrarGrupo(grupoId);
    this.carregar(0);
  }

  alternar(a: AtendidoEscolhido): void {
    this.escolhidos.update((lista) =>
      this.estaEscolhido(a) ? lista.filter((e) => e.assistidoId !== a.assistidoId) : [...lista, a],
    );
  }

  estaEscolhido(a: AtendidoEscolhido): boolean {
    return this.escolhidos().some((e) => e.assistidoId === a.assistidoId);
  }

  rotulo(a: AtendidoEscolhido): string {
    return a.idade != null ? `${a.nomeCompleto}, ${a.idade} anos` : a.nomeCompleto;
  }

  carregarMais(): void {
    if (this.temMais() && !this.carregando()) this.carregar(this.pagina() + 1);
  }

  private async carregar(pagina: number): Promise<void> {
    const requisicao = ++this.requisicao;
    this.carregando.set(true);
    this.erro.set(null);
    try {
      let params = new HttpParams().set('status', 'ATIVO').set('pagina', pagina).set('tamanho', TAMANHO_PAGINA);
      const busca = this.termo().trim();
      if (busca) params = params.set('busca', busca);
      const grupoId = this.grupoId();
      if (grupoId !== null) params = params.set('turmaId', grupoId);

      const resposta = await firstValueFrom(
        this.http.get<PaginaResponse<AssistidoResponseDTO>>(`${environment.apiUrl}/api/assistidos`, { params }),
      );
      if (requisicao !== this.requisicao) return; // a pessoa já mudou a busca ou o grupo

      const novos = resposta.conteudo.map(paraEscolhido);
      this.itens.update((atuais) => (pagina === 0 ? novos : [...atuais, ...novos]));
      this.pagina.set(pagina);
      this.totalPaginas.set(resposta.totalPaginas);
      this.total.set(resposta.totalElementos);
    } catch {
      if (requisicao === this.requisicao) this.erro.set('Não foi possível carregar os atendidos. Tente de novo.');
    } finally {
      if (requisicao === this.requisicao) this.carregando.set(false);
    }
  }

  tentarDeNovo(): void {
    this.carregar(0);
  }

  private async carregarGrupos(): Promise<void> {
    try {
      const params = new HttpParams().set('ativo', true);
      const grupos = await firstValueFrom(
        this.http.get<TurmaResponseDTO[]>(`${environment.apiUrl}/api/turmas`, { params }),
      );
      this.grupos.set([...grupos].sort((a, b) => a.nomeTurma.localeCompare(b.nomeTurma, 'pt-BR')));
      // Grupo lembrado que deixou de existir: volta para todos.
      const lembrado = this.grupoId();
      if (lembrado !== null && !grupos.some((g) => g.turmaId === lembrado)) this.filtrarGrupo(null);
    } catch {
      this.grupos.set([]); // sem grupos, a grade e a busca continuam funcionando
    }
  }

  private lerGrupoLembrado(): number | null {
    try {
      const valor = this.document.defaultView?.localStorage.getItem(CHAVE_GRUPO);
      return valor ? Number(valor) : null;
    } catch {
      return null;
    }
  }

  private lembrarGrupo(grupoId: number | null): void {
    try {
      const armazenamento = this.document.defaultView?.localStorage;
      if (grupoId === null) armazenamento?.removeItem(CHAVE_GRUPO);
      else armazenamento?.setItem(CHAVE_GRUPO, String(grupoId));
    } catch {
      // navegador sem armazenamento: só não lembra o grupo
    }
  }
}

function paraEscolhido(a: AssistidoResponseDTO): AtendidoEscolhido {
  return {
    assistidoId: a.assistidoId,
    nomeCompleto: a.nomeCompleto,
    idade: calcularIdade(a.dataNascimento),
    nomeTurma: a.nomeTurma ?? null,
    totalOcorrenciasAtivas: a.totalOcorrenciasAtivas,
    totalAdvertenciasAtivas: a.totalAdvertenciasAtivas,
    totalSuspensoes: a.totalSuspensoes,
  };
}
