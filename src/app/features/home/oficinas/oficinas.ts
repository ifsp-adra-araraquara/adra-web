import { Component, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { OficinaRequestDTO } from '../../../shared/models/oficina/OficinaRequestDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Modal } from '../../../shared/components/modal/modal';
import { Table, TableColumn } from '../../../shared/components/table/table';

@Component({
  selector: 'app-oficinas',
  standalone: true,
  imports: [CommonModule, FormsModule, Select, Modal, Table],
  templateUrl: './oficinas.html',
  styleUrl: './oficinas.css',
})
export class Oficinas implements OnInit {
  private http = inject(HttpClient);

  private readonly apiOficinas = `${environment.apiUrl}/api/oficinas`;

  oficinas = signal<OficinaResponseDTO[]>([]);
  carregando = signal(false);
  erroListar = signal<string | null>(null);

  readonly colunasOficinas: TableColumn<OficinaResponseDTO>[] = [
    { key: 'nomeOficina', header: 'Nome da oficina', sortable: true },
    { key: 'oficineiroResponsavel', header: 'Oficineiro responsável', sortable: true },
    { key: 'ativo', header: 'Status', type: 'badge', width: '140px' },
  ];

  protected readonly trackByOficinaId = (oficina: OficinaResponseDTO) => oficina.oficinaId;

  filtroNome = '';
  filtroStatus: 'todas' | 'ativas' | 'inativas' = 'ativas';

  filtroStatusOptions: SelectOption<'todas' | 'ativas' | 'inativas'>[] = [
    { value: 'ativas', label: 'Ativas' },
    { value: 'inativas', label: 'Inativas' },
    { value: 'todas', label: 'Todas' }
  ];
  
  private debounceTimerListagem?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.carregarOficinas();
  }

  onFiltroNomeChange(valor: string): void {
    this.filtroNome = valor;
    clearTimeout(this.debounceTimerListagem);
    this.debounceTimerListagem = setTimeout(() => this.carregarOficinas(), 400);
  }

  onFiltroStatusChange(valor: 'todas' | 'ativas' | 'inativas'): void {
    this.filtroStatus = valor;
    this.carregarOficinas();
  }

  carregarOficinas(): void {
    this.carregando.set(true);
    this.erroListar.set(null);

    let params = new HttpParams();

    if (this.filtroNome.trim()) {
      params = params.set('nome', this.filtroNome.trim());
    }

    if (this.filtroStatus === 'ativas') {
      params = params.set('ativo', 'true');
    } else if (this.filtroStatus === 'inativas') {
      params = params.set('ativo', 'false');
    }

    this.http.get<OficinaResponseDTO[]>(this.apiOficinas, { params }).subscribe({
      next: (lista) => {
        this.oficinas.set(lista);
        this.carregando.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar oficinas:', erro);
        this.erroListar.set('Não foi possível carregar as oficinas.');
        this.carregando.set(false);
      },
    });
  }

  /* ============================================================
   * MODAL: NOVA OFICINA (US-13)
   * ============================================================ */
  mostrarModalForm = signal(false);
  salvando = signal(false);
  erroSalvar = signal<string | null>(null);

  // CA de FE: alerta NAO BLOQUEANTE de duplicidade por nome.
  // Nunca impede o submit - apenas avisa.
  alertaDuplicidade = signal(false);
  private debounceTimerDuplicidade?: ReturnType<typeof setTimeout>;

  formOficina: OficinaRequestDTO = this.oficinaVazia();

  private oficinaVazia(): OficinaRequestDTO {
    return {
      nomeOficina: '',
      oficineiroResponsavel: '',
    };
  }

  abrirModalNovaOficina(): void {
    this.formOficina = this.oficinaVazia();
    this.erroSalvar.set(null);
    this.alertaDuplicidade.set(false);
    this.modoEdicao.set(false);
    this.oficinaSendoEditada.set(null);
    this.mostrarModalForm.set(true);
  }

  fecharModalForm(): void {
    this.mostrarModalForm.set(false);
    this.modoEdicao.set(false);
    this.oficinaSendoEditada.set(null);
  }

  atualizarCampoOficina(campo: keyof OficinaRequestDTO, valor: string): void {
    this.formOficina = { ...this.formOficina, [campo]: valor };

    if (campo === 'nomeOficina') {
      this.dispararChecagemDuplicidade(valor);
    }
  }

  /**
   * Debounce de 400ms para não bater na API a cada tecla; se a checagem
   * falhar (rede, 403 etc.) o alerta simplesmente não aparece - isso
   * nunca bloqueia o cadastro, é só um aviso a mais.
   */
  private dispararChecagemDuplicidade(nome: string): void {
    clearTimeout(this.debounceTimerDuplicidade);

    if (!nome.trim()) {
      this.alertaDuplicidade.set(false);
      return;
    }

    this.debounceTimerDuplicidade = setTimeout(async () => {
      try {
        const resultado = await firstValueFrom(
          this.http.get<{ possivelDuplicidade: boolean }>(
            `${this.apiOficinas}/verificar-duplicidade`,
            { params: new HttpParams().set('nome', nome.trim()) },
          ),
        );
        this.alertaDuplicidade.set(resultado.possivelDuplicidade);
      } catch {
        this.alertaDuplicidade.set(false);
      }
    }, 400);
  }

  async salvarOficina(): Promise<void> {
    if (this.salvando()) {
      return;
    }

    if (!this.formOficina.nomeOficina.trim()) {
      this.erroSalvar.set('Informe o nome da oficina.');
      return;
    }

    if (!this.formOficina.oficineiroResponsavel.trim()) {
      this.erroSalvar.set('Informe o oficineiro responsável.');
      return;
    }

    this.salvando.set(true);
    this.erroSalvar.set(null);

    try {
      if (this.modoEdicao() && this.oficinaSendoEditada()) {
        // Modo edição: PUT
        await firstValueFrom(
          this.http.put<OficinaResponseDTO>(
            `${this.apiOficinas}/${this.oficinaSendoEditada()!.oficinaId}`,
            this.formOficina
          )
        );
      } else {
        // Modo novo: POST
        await firstValueFrom(
          this.http.post<OficinaResponseDTO>(this.apiOficinas, this.formOficina)
        );
      }

      this.salvando.set(false);
      this.fecharModalForm();
      this.carregarOficinas();
    } catch (erro: any) {
      console.error('Erro ao salvar oficina:', erro);
      this.erroSalvar.set(
        erro?.error?.message ?? 'Não foi possível salvar a oficina. Verifique os dados e tente novamente.',
      );
      this.salvando.set(false);
    }
  }

  /* ============================================================
   * MODAL: EDITAR OFICINA (US-14)
   * ============================================================ */
  modoEdicao = signal(false);
  oficinaSendoEditada = signal<OficinaResponseDTO | null>(null);

  abrirModalEdicao(oficina: OficinaResponseDTO): void {
    this.modoEdicao.set(true);
    this.oficinaSendoEditada.set(oficina);
    this.formOficina = {
      nomeOficina: oficina.nomeOficina,
      oficineiroResponsavel: oficina.oficineiroResponsavel,
    };
    this.erroSalvar.set(null);
    this.alertaDuplicidade.set(false);
    this.mostrarModalForm.set(true);
  }

  /* ============================================================
   * MODAL: CONFIRMAÇÃO DE INATIVAÇÃO (US-14)
   * ============================================================ */
  mostrarConfirmacaoInativacao = signal(false);
  oficinaSendoInativada = signal<OficinaResponseDTO | null>(null);
  inativando = signal(false);
  erroInativar = signal<string | null>(null);

  abrirConfirmacaoInativacao(oficina: OficinaResponseDTO): void {
    this.oficinaSendoInativada.set(oficina);
    this.erroInativar.set(null);
    this.mostrarConfirmacaoInativacao.set(true);
  }

  fecharConfirmacaoInativacao(): void {
    this.mostrarConfirmacaoInativacao.set(false);
    this.oficinaSendoInativada.set(null);
  }

  async confirmarInativacao(): Promise<void> {
    if (this.inativando() || !this.oficinaSendoInativada()) {
      return;
    }

    this.inativando.set(true);
    this.erroInativar.set(null);

    try {
      await firstValueFrom(
        this.http.patch<OficinaResponseDTO>(
          `${this.apiOficinas}/${this.oficinaSendoInativada()!.oficinaId}/inativar`,
          {}
        )
      );

      this.inativando.set(false);
      this.fecharConfirmacaoInativacao();
      this.carregarOficinas();
    } catch (erro: any) {
      console.error('Erro ao inativar oficina:', erro);
      this.erroInativar.set(
        erro?.error?.message ?? 'Não foi possível inativar a oficina. Tente novamente.'
      );
      this.inativando.set(false);
    }
  }

  /* ============================================================
   * MODAL: CONFIRMAÇÃO DE REATIVAÇÃO (US-14)
   * ============================================================ */
  mostrarConfirmacaoReativacao = signal(false);
  oficinaSendoReativada = signal<OficinaResponseDTO | null>(null);
  reativando = signal(false);
  erroReativar = signal<string | null>(null);

  abrirConfirmacaoReativacao(oficina: OficinaResponseDTO): void {
    this.oficinaSendoReativada.set(oficina);
    this.erroReativar.set(null);
    this.mostrarConfirmacaoReativacao.set(true);
  }

  fecharConfirmacaoReativacao(): void {
    this.mostrarConfirmacaoReativacao.set(false);
    this.oficinaSendoReativada.set(null);
  }

  async confirmarReativacao(): Promise<void> {
    if (this.reativando() || !this.oficinaSendoReativada()) {
      return;
    }

    this.reativando.set(true);
    this.erroReativar.set(null);

    try {
      await firstValueFrom(
        this.http.patch<OficinaResponseDTO>(
          `${this.apiOficinas}/${this.oficinaSendoReativada()!.oficinaId}/reativar`,
          {}
        )
      );

      this.reativando.set(false);
      this.fecharConfirmacaoReativacao();
      this.carregarOficinas();
    } catch (erro: any) {
      console.error('Erro ao reativar oficina:', erro);
      this.erroReativar.set(
        erro?.error?.message ?? 'Não foi possível reativar a oficina. Tente novamente.'
      );
      this.reativando.set(false);
    }
  }
}
