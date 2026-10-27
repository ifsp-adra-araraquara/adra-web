import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResponsavelService } from '../../../core/responsavel.service';
import { ResponsavelResponseDTO } from '../../../shared/models/responsavel/ResponsavelResponseDTO';
import { AssistidoVinculadoDTO } from '../../../shared/models/responsavel/AssistidoVinculadoDTO';
import { StatusGeral } from '../../../shared/enum/StatusGeral';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Badge } from '../../../shared/components/badge/badge';
import { ResponsavelForm } from './form/responsavel-form';
import { Modal } from '../../../shared/components/modal/modal';
import { Button } from '../../../shared/components/button/button';
import { Input } from '../../../shared/components/input/input';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Icon } from '../../../shared/components/icon/icon';
import { ActionMenu, ActionMenuItem } from '../../../shared/components/action-menu/action-menu';
import { cliqueEmElementoInterativo } from '../../../shared/utils/clique.util';
import { formatarEndereco } from '../../../shared/utils/endereco.util';
import { calcularIdade } from '../../../shared/utils/idade.util';
import { formatarMoeda } from '../../../shared/utils/mascara.util';
import { ESCOLARIDADE_LABELS } from '../../../shared/enum/Escolaridade';
import { ESTADO_CIVIL_LABELS } from '../../../shared/enum/EstadoCivil';

type FiltroContato = 'todos' | 'sem-telefone' | 'sem-email' | 'sem-vinculo';

@Component({
  selector: 'app-responsaveis',
  imports: [DatePipe, ActionMenu, Avatar, Badge, Icon, FormsModule, ResponsavelForm, Modal, Button, Input, Select],
  templateUrl: './responsaveis.html',
  styleUrl: './responsaveis.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Responsaveis implements OnInit {
  private responsavelService = inject(ResponsavelService);
  private router = inject(Router);

  protected readonly StatusGeral = StatusGeral;

  protected readonly formatarEndereco = formatarEndereco;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idade = calcularIdade;
  protected readonly escolaridadeLabels = ESCOLARIDADE_LABELS;
  protected readonly estadoCivilLabels = ESTADO_CIVIL_LABELS;

  responsaveis = signal<ResponsavelResponseDTO[]>([]);
  carregando = signal(false);

  mostrarModal = signal(false);
  responsavelSelecionado = signal<ResponsavelResponseDTO | null>(null);
  responsavelVisualizado = signal<ResponsavelResponseDTO | null>(null);

  /** Sem suporte a filtro/paginação no backend (GET /api/responsaveis é findAll() puro) — filtra em memória. */
  termoBusca = signal('');
  filtroContato = signal<FiltroContato>('todos');

  readonly filtroContatoOptions: SelectOption<FiltroContato>[] = [
    { value: 'todos', label: 'Todos os contatos' },
    { value: 'sem-telefone', label: 'Sem telefone' },
    { value: 'sem-email', label: 'Sem e-mail' },
    { value: 'sem-vinculo', label: 'Sem assistido vinculado' },
  ];

  readonly responsaveisFiltrados = computed(() => {
    const termo = this.termoBusca().trim().toLowerCase();
    const filtro = this.filtroContato();

    return this.responsaveis().filter((r) => {
      const combinaTermo =
        !termo ||
        r.nomeCompleto.toLowerCase().includes(termo) ||
        (r.cpf ?? '').includes(termo) ||
        (r.telefone ?? '').includes(termo);

      const combinaFiltro =
        filtro === 'todos' ||
        (filtro === 'sem-telefone' && !r.telefone) ||
        (filtro === 'sem-email' && !r.email) ||
        (filtro === 'sem-vinculo' && !r.totalAssistidos);

      return combinaTermo && combinaFiltro;
    });
  });

  readonly temFiltrosAtivos = computed(
    () => !!this.termoBusca().trim() || this.filtroContato() !== 'todos',
  );

  onBuscaChange(valor: string): void {
    this.termoBusca.set(valor);
  }

  onFiltroContatoChange(valor: FiltroContato): void {
    this.filtroContato.set(valor);
  }

  limparFiltros(): void {
    this.termoBusca.set('');
    this.filtroContato.set('todos');
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.responsavelService.listar().subscribe({
      next: (lista) => {
        this.responsaveis.set(lista);
        this.carregando.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar responsáveis:', erro);
        this.carregando.set(false);
      },
    });
  }

  get dataMaxima(): string {
    return new Date().toISOString().split('T')[0];
  }

  abrirNovo(): void {
    this.responsavelSelecionado.set(null);
    this.mostrarModal.set(true);
  }

  abrirEdicao(responsavel: ResponsavelResponseDTO): void {
    this.responsavelSelecionado.set(responsavel);
    this.mostrarModal.set(true);
  }

  /* Assistidos vinculados: pedidos só ao abrir a ficha (a listagem já traz a contagem). */
  assistidosVinculados = signal<AssistidoVinculadoDTO[] | null>(null);
  erroVinculados = signal(false);

  abrirVisualizacao(responsavel: ResponsavelResponseDTO): void {
    this.responsavelVisualizado.set(responsavel);
    this.assistidosVinculados.set(null);
    this.erroVinculados.set(false);
    this.responsavelService.listarAssistidos(responsavel.responsavelId).subscribe({
      next: (lista) => {
        if (this.responsavelVisualizado()?.responsavelId === responsavel.responsavelId) {
          this.assistidosVinculados.set(lista);
        }
      },
      error: () => this.erroVinculados.set(true),
    });
  }

  abrirAssistido(assistidoId: number): void {
    this.fecharVisualizacao();
    this.router.navigate(['/assistidos'], { queryParams: { assistidoId } });
  }

  /** "2 assistidos · 1 inativo" — texto da coluna da lista. */
  resumoVinculos(r: ResponsavelResponseDTO): string {
    const total = r.totalAssistidos ?? 0;
    if (total === 0) return 'Nenhum';
    const inativos = total - (r.assistidosAtivos ?? 0);
    return inativos > 0 ? `${total} · ${inativos} ${inativos === 1 ? 'inativo' : 'inativos'}` : String(total);
  }

  abrirVisualizacaoPelaLinha(evento: MouseEvent, responsavel: ResponsavelResponseDTO): void {
    if (!cliqueEmElementoInterativo(evento)) {
      this.abrirVisualizacao(responsavel);
    }
  }

  fecharVisualizacao(): void {
    this.responsavelVisualizado.set(null);
  }

  /** Menu ">" da linha. Editar só por aqui: a visualização (linha/"Ver") é só leitura. */
  readonly acoesResponsavel: ActionMenuItem[] = [
    { id: 'ver', label: 'Ver responsável', icon: 'eye' },
    { id: 'editar', label: 'Editar', icon: 'edit' },
  ];

  executarAcao(acao: string, responsavel: ResponsavelResponseDTO): void {
    if (acao === 'ver') {
      this.abrirVisualizacao(responsavel);
    } else if (acao === 'editar') {
      this.abrirEdicao(responsavel);
    }
  }

  aoSalvar(): void {
    this.mostrarModal.set(false);
    this.responsavelSelecionado.set(null);
    this.carregar();
  }

  aoCancelar(): void {
    this.mostrarModal.set(false);
    this.responsavelSelecionado.set(null);
  }
}