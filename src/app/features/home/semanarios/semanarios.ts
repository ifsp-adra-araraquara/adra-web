import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SemanarioService } from '../../../core/semanario.service';
import { SemanarioResponseDTO } from '../../../shared/models/semanario/SemanarioResponseDTO';
import { TabelaSemanarios } from '../../../shared/components/tabela-semanarios/tabela-semanarios';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

/** Soma dias a uma data ISO ("2026-11-02") sem passar por fuso. */
function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia + dias);
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${m}-${d}`;
}

/** Minúsculo e sem acento, para a busca achar "historia" em "História". */
function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Opções únicas (id → nome) dos semanários carregados, em ordem alfabética, com "Todos" no topo. */
function opcoes(
  lista: SemanarioResponseDTO[],
  id: (s: SemanarioResponseDTO) => number,
  nome: (s: SemanarioResponseDTO) => string,
  rotuloTodos: string,
): SelectOption<number | null>[] {
  const unicos = new Map<number, string>();
  for (const s of lista) unicos.set(id(s), nome(s));
  return [
    { value: null, label: rotuloTodos },
    ...[...unicos]
      .sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'))
      .map(([value, label]) => ({ value, label })),
  ];
}

/**
 * Semanários de todas as oficinas, para a coordenação — a mesma visão do Oficineiro (que vê só os
 * das oficinas dele), com filtros por busca, grupo, oficina e período. Os filtros rodam no front:
 * a lista inteira vem numa chamada só e o volume (um semanário por grupo por semana) é pequeno.
 */
@Component({
  selector: 'app-semanarios',
  imports: [FormsModule, TabelaSemanarios, Select, Input, Button, Icon],
  templateUrl: './semanarios.html',
  styleUrl: './semanarios.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Semanarios implements OnInit {
  private readonly semanarioService = inject(SemanarioService);

  readonly semanarios = signal<SemanarioResponseDTO[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  // ---- Filtros ----
  readonly busca = signal('');
  readonly grupoId = signal<number | null>(null);
  readonly oficinaId = signal<number | null>(null);
  /** Período (datas ISO); entra o semanário cuja semana (seg. a dom.) encosta no intervalo. */
  readonly de = signal('');
  readonly ate = signal('');

  readonly grupoOptions = computed(() =>
    opcoes(this.semanarios(), (s) => s.turmaId, (s) => s.nomeTurma, 'Todos os grupos'),
  );
  readonly oficinaOptions = computed(() =>
    opcoes(this.semanarios(), (s) => s.oficinaId, (s) => s.nomeOficina, 'Todas as oficinas'),
  );

  readonly temFiltro = computed(
    () => !!this.busca().trim() || this.grupoId() !== null || this.oficinaId() !== null || !!this.de() || !!this.ate(),
  );

  readonly periodoInvalido = computed(() => !!this.de() && !!this.ate() && this.de() > this.ate());

  readonly filtrados = computed(() => {
    const termo = normalizar(this.busca().trim());
    const grupo = this.grupoId();
    const oficina = this.oficinaId();
    const de = this.de();
    const ate = this.ate();
    if (this.periodoInvalido()) return [];

    return this.semanarios().filter((s) => {
      if (grupo !== null && s.turmaId !== grupo) return false;
      if (oficina !== null && s.oficinaId !== oficina) return false;
      if (ate && s.semanaInicio > ate) return false;
      if (de && somarDias(s.semanaInicio, 6) < de) return false;
      if (!termo) return true;
      return [s.conteudoPrevisto, s.objetivos, s.recursosNecessarios, s.nomeTurma, s.nomeOficina, s.nomeEnviadoPor]
        .some((campo) => normalizar(campo).includes(termo));
    });
  });

  readonly resumo = computed(() => {
    const total = this.filtrados().length;
    const texto = total === 1 ? '1 semanário' : `${total} semanários`;
    return this.temFiltro() ? `${texto} de ${this.semanarios().length}` : texto;
  });

  ngOnInit(): void {
    this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      this.semanarios.set(await this.semanarioService.listarTodos());
    } catch (e) {
      const padrao = 'Não foi possível carregar os semanários.';
      this.erro.set(e instanceof HttpErrorResponse ? mensagemErro(e, padrao) : padrao);
    } finally {
      this.carregando.set(false);
    }
  }

  limparFiltros(): void {
    this.busca.set('');
    this.grupoId.set(null);
    this.oficinaId.set(null);
    this.de.set('');
    this.ate.set('');
  }

  async remover(semanario: SemanarioResponseDTO): Promise<void> {
    this.erro.set(null);
    try {
      await this.semanarioService.remover(semanario.semanarioId);
      this.semanarios.update((lista) => lista.filter((s) => s.semanarioId !== semanario.semanarioId));
      // Era o último do grupo/oficina filtrado: a opção some do select, então o filtro volta para "Todos".
      if (!this.semanarios().some((s) => s.turmaId === this.grupoId())) this.grupoId.set(null);
      if (!this.semanarios().some((s) => s.oficinaId === this.oficinaId())) this.oficinaId.set(null);
    } catch (e) {
      const padrao = 'Não foi possível remover o semanário.';
      this.erro.set(e instanceof HttpErrorResponse ? mensagemErro(e, padrao) : padrao);
    }
  }
}
