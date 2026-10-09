import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ResponsavelService } from '../../../core/responsavel.service';
import { ResponsavelResponseDTO } from '../../../shared/models/responsavel/ResponsavelResponseDTO';
import { ResponsavelForm } from './form/responsavel-form';
import { Modal } from '../../../shared/components/modal/modal';
import { Button } from '../../../shared/components/button/button';
import { Input } from '../../../shared/components/input/input';
import { Select, SelectOption } from '../../../shared/components/select/select';

type FiltroContato = 'todos' | 'sem-telefone' | 'sem-email';

@Component({
  selector: 'app-responsaveis',
  imports: [FormsModule, ResponsavelForm, Modal, Button, Input, Select],
  templateUrl: './responsaveis.html',
  styleUrl: './responsaveis.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Responsaveis implements OnInit {
  private responsavelService = inject(ResponsavelService);

  responsaveis = signal<ResponsavelResponseDTO[]>([]);
  carregando = signal(false);

  mostrarModal = signal(false);
  responsavelSelecionado = signal<ResponsavelResponseDTO | null>(null);

  /** Sem suporte a filtro/paginação no backend (GET /api/responsaveis é findAll() puro) — filtra em memória. */
  termoBusca = signal('');
  filtroContato = signal<FiltroContato>('todos');

  readonly filtroContatoOptions: SelectOption<FiltroContato>[] = [
    { value: 'todos', label: 'Todos os contatos' },
    { value: 'sem-telefone', label: 'Sem telefone' },
    { value: 'sem-email', label: 'Sem e-mail' },
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
        (filtro === 'sem-email' && !r.email);

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