import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FiltrosSemanario, SemanarioService } from '../../../core/semanario.service';
import { SemanarioResponseDTO } from '../../../shared/models/semanario/SemanarioResponseDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { TabelaSemanarios } from '../../../shared/components/tabela-semanarios/tabela-semanarios';
import { NavegadorSemana } from '../../../shared/components/navegador-semana/navegador-semana';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { segundaDaSemana } from '../../../shared/utils/semana.util';
import { hojeISO } from '../../../shared/utils/aula.util';

const TAMANHO_PAGINA = 20;
const ESPERA_BUSCA_MS = 350;

type ModoPeriodo = 'semana' | 'todas';

function erroOu(e: unknown, padrao: string): string {
  return e instanceof HttpErrorResponse ? mensagemErro(e, padrao) : padrao;
}

/** "Todos" no topo; inativos no fim, marcados (semanários antigos podem ser de grupo/oficina inativa). */
function opcoes<T>(
  itens: T[],
  id: (i: T) => number,
  nome: (i: T) => string,
  ativo: (i: T) => boolean,
  rotuloTodos: string,
): SelectOption<number | null>[] {
  const ordenados = [...itens].sort(
    (a, b) => Number(ativo(b)) - Number(ativo(a)) || nome(a).localeCompare(nome(b), 'pt-BR'),
  );
  return [
    { value: null, label: rotuloTodos },
    ...ordenados.map((i) => ({ value: id(i), label: ativo(i) ? nome(i) : `${nome(i)} (inativo)` })),
  ];
}

/**
 * Semanários de todas as oficinas, para a coordenação: a mesma visão do Oficineiro (que vê só os
 * das oficinas dele), com navegação por semana, filtros por busca, grupo e oficina e paginação.
 * Filtros e paginação rodam na API (GET /api/semanarios).
 */
@Component({
  selector: 'app-semanarios',
  imports: [FormsModule, TabelaSemanarios, NavegadorSemana, Select, Input, Button, Icon],
  templateUrl: './semanarios.html',
  styleUrl: './semanarios.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Semanarios implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly semanarioService = inject(SemanarioService);
  private readonly api = environment.apiUrl;

  readonly semanarios = signal<SemanarioResponseDTO[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  // ---- Período ----
  readonly modo = signal<ModoPeriodo>('semana');
  /** Segunda-feira da semana exibida no modo "Por semana". */
  readonly semana = signal(segundaDaSemana(hojeISO()));

  // ---- Filtros ----
  readonly busca = signal('');
  readonly grupoId = signal<number | null>(null);
  readonly oficinaId = signal<number | null>(null);
  readonly grupoOptions = signal<SelectOption<number | null>[]>([{ value: null, label: 'Todos os grupos' }]);
  readonly oficinaOptions = signal<SelectOption<number | null>[]>([{ value: null, label: 'Todas as oficinas' }]);

  // ---- Paginação ----
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly totalElementos = signal(0);
  readonly temAnterior = computed(() => this.pagina() > 0);
  readonly temProxima = computed(() => this.pagina() < this.totalPaginas() - 1);

  readonly temFiltro = computed(() => !!this.busca().trim() || this.grupoId() !== null || this.oficinaId() !== null);

  readonly vazio = computed(() => {
    if (this.temFiltro()) return 'Nenhum semanário encontrado com esses filtros.';
    return this.modo() === 'semana' ? 'Nenhum semanário enviado nesta semana.' : 'Nenhum semanário enviado ainda.';
  });

  private esperaBusca: ReturnType<typeof setTimeout> | undefined;
  /** Descarta respostas de buscas antigas que chegam depois da mais nova. */
  private requisicao = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.esperaBusca));
  }

  ngOnInit(): void {
    this.carregarOpcoes();
    this.carregar(0);
  }

  // ---- Período ----
  mudarModo(modo: ModoPeriodo): void {
    if (this.modo() === modo) return;
    this.modo.set(modo);
    this.carregar(0);
  }

  mudarSemana(segunda: string): void {
    this.semana.set(segunda);
    this.carregar(0);
  }

  // ---- Filtros ----
  mudarBusca(valor: string): void {
    this.busca.set(valor);
    clearTimeout(this.esperaBusca);
    this.esperaBusca = setTimeout(() => this.carregar(0), ESPERA_BUSCA_MS);
  }

  mudarGrupo(id: number | null): void {
    this.grupoId.set(id);
    this.carregar(0);
  }

  mudarOficina(id: number | null): void {
    this.oficinaId.set(id);
    this.carregar(0);
  }

  limparFiltros(): void {
    clearTimeout(this.esperaBusca);
    this.busca.set('');
    this.grupoId.set(null);
    this.oficinaId.set(null);
    this.carregar(0);
  }

  // ---- Paginação ----
  paginaAnterior(): void {
    if (this.temAnterior()) this.carregar(this.pagina() - 1);
  }

  proximaPagina(): void {
    if (this.temProxima()) this.carregar(this.pagina() + 1);
  }

  async remover(semanario: SemanarioResponseDTO): Promise<void> {
    this.erro.set(null);
    try {
      await this.semanarioService.remover(semanario.semanarioId);
      // Era o último da página: volta uma.
      const pagina = this.semanarios().length === 1 && this.pagina() > 0 ? this.pagina() - 1 : this.pagina();
      await this.carregar(pagina);
    } catch (e) {
      this.erro.set(erroOu(e, 'Não foi possível remover o semanário.'));
    }
  }

  async carregar(pagina: number): Promise<void> {
    const requisicao = ++this.requisicao;
    const filtros: FiltrosSemanario = {
      semana: this.modo() === 'semana' ? this.semana() : null,
      turmaId: this.grupoId(),
      oficinaId: this.oficinaId(),
      busca: this.busca(),
      pagina,
      tamanho: TAMANHO_PAGINA,
    };
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const resposta = await this.semanarioService.listar(filtros);
      if (requisicao !== this.requisicao) return;
      this.semanarios.set(resposta.conteudo);
      this.pagina.set(resposta.pagina);
      this.totalPaginas.set(resposta.totalPaginas);
      this.totalElementos.set(resposta.totalElementos);
    } catch (e) {
      if (requisicao !== this.requisicao) return;
      this.semanarios.set([]);
      this.erro.set(erroOu(e, 'Não foi possível carregar os semanários.'));
    } finally {
      if (requisicao === this.requisicao) this.carregando.set(false);
    }
  }

  /** Grupos e oficinas para os filtros (inclui inativos: semanários antigos podem ser deles). */
  private async carregarOpcoes(): Promise<void> {
    try {
      const [turmas, oficinas] = await Promise.all([
        firstValueFrom(this.http.get<TurmaResponseDTO[]>(`${this.api}/api/turmas`)),
        firstValueFrom(this.http.get<OficinaResponseDTO[]>(`${this.api}/api/oficinas`)),
      ]);
      this.grupoOptions.set(opcoes(turmas, (t) => t.turmaId, (t) => t.nomeTurma, (t) => t.ativo, 'Todos os grupos'));
      this.oficinaOptions.set(opcoes(oficinas, (o) => o.oficinaId, (o) => o.nomeOficina, (o) => o.ativo, 'Todas as oficinas'));
    } catch {
      // Sem as opções, a busca e a navegação por semana continuam funcionando.
    }
  }
}
