import { Component, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { Turno, TURNOS_DISPONIVEIS } from '../../../shared/enum/Turno';

import { TurmaRequestDTO } from '../../../shared/models/turma/TurmaRequestDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { TurmaStatusRequestDTO } from '../../../shared/models/turma/TurmaStatusRequestDTO';


@Component({
  selector: 'app-turmas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turma.html',
  styleUrl: './turma.css',
})
export class Turmas implements OnInit {
  private http = inject(HttpClient);

  private readonly apiTurmas = `${environment.apiUrl}/api/turmas`;

  Turno = Turno;
  turnosDisponiveis = TURNOS_DISPONIVEIS;

  turmas = signal<TurmaResponseDTO[]>([]);
  carregando = signal(false);
  erroListar = signal<string | null>(null);

  filtroNome = '';
  filtroTurno: Turno | '' = '';
  filtroStatus: 'todas' | 'ativas' | 'inativas' = 'ativas';

  private debounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.carregarTurmas();
  }

  onFiltroNomeChange(valor: string): void {
    this.filtroNome = valor;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.carregarTurmas(), 400);
  }

  onFiltroTurnoChange(valor: Turno | ''): void {
    this.filtroTurno = valor;
    this.carregarTurmas();
  }

  onFiltroStatusChange(valor: 'todas' | 'ativas' | 'inativas'): void {
    this.filtroStatus = valor;
    this.carregarTurmas();
  }

  


  carregarTurmas(): void {
  this.carregando.set(true);
  this.erroListar.set(null);

  let params = new HttpParams();

  if (this.filtroNome.trim()) {
    params = params.set('nome', this.filtroNome.trim());
  }

  if (this.filtroTurno) {
    params = params.set('turno', this.filtroTurno); // Envia "MANHA" ou "Manhã"
  }

  if (this.filtroStatus === 'ativas') {
    params = params.set('ativo', 'true');
  } else if (this.filtroStatus === 'inativas') {
    params = params.set('ativo', 'false');
  }

  this.http.get<TurmaResponseDTO[]>(this.apiTurmas, { params }).subscribe({
    next: (lista) => {
      this.turmas.set(lista);
      this.carregando.set(false);
    },
    error: (erro) => {
      console.error('Erro ao carregar turmas:', erro);
      this.erroListar.set('Não foi possível carregar as turmas.');
      this.carregando.set(false);
    },
  });
}



  /* ============================================================
   * MODAL: NOVA / EDITAR TURMA (US-09 e US-11)
   * O mesmo modal atende os dois casos: se turmaEmEdicao() tiver
   * valor, é um PUT; caso contrário, é um POST.
   * ============================================================ */
  mostrarModalForm = signal(false);
  salvando = signal(false);
  erroSalvar = signal<string | null>(null);
  turmaEmEdicao = signal<TurmaResponseDTO | null>(null);

  formTurma: TurmaRequestDTO = this.turmaVazia();

  private turmaVazia(): TurmaRequestDTO {
    return {
      nomeTurma: '',
      turno: '',
      faixaEtaria: '',
      capacidade: null,
      observacoes: '',
    };
  }

  abrirModalNovaTurma(): void {
    this.turmaEmEdicao.set(null);
    this.formTurma = this.turmaVazia();
    this.erroSalvar.set(null);
    this.mostrarModalForm.set(true);
  }

  abrirModalEditarTurma(turma: TurmaResponseDTO): void {
    this.turmaEmEdicao.set(turma);
    this.formTurma = {
      nomeTurma: turma.nomeTurma,
      turno: turma.turno,
      faixaEtaria: turma.faixaEtaria,
      capacidade: turma.capacidade,
      observacoes: turma.observacoes ?? '',
    };
    this.erroSalvar.set(null);
    this.mostrarModalForm.set(true);
  }

  fecharModalForm(): void {
    this.mostrarModalForm.set(false);
  }

  atualizarCampoTurma(campo: keyof TurmaRequestDTO, valor: string | number | null): void {
    this.formTurma = { ...this.formTurma, [campo]: valor };
  }

  async salvarTurma(): Promise<void> {
    if (this.salvando()) {
      return;
    }

    if (!this.formTurma.nomeTurma.trim()) {
      this.erroSalvar.set('Informe o nome da turma.');
      return;
    }

    if (!this.formTurma.turno) {
      this.erroSalvar.set('Selecione o turno.');
      return;
    }

    if (!this.formTurma.capacidade || this.formTurma.capacidade <= 0) {
      this.erroSalvar.set('Informe uma capacidade válida.');
      return;
    }

    this.salvando.set(true);
    this.erroSalvar.set(null);

    const emEdicao = this.turmaEmEdicao();

    try {
      if (emEdicao) {
        await firstValueFrom(
          this.http.put<TurmaResponseDTO>(`${this.apiTurmas}/${emEdicao.turmaId}`, this.formTurma),
        );
      } else {
        await firstValueFrom(this.http.post<TurmaResponseDTO>(this.apiTurmas, this.formTurma));
      }

      this.salvando.set(false);
      this.fecharModalForm();
      this.carregarTurmas();
    } catch (erro: any) {
      console.error('Erro ao salvar turma:', erro);
      this.erroSalvar.set(
        erro?.error?.message ?? 'Não foi possível salvar a turma. Verifique os dados e tente novamente.',
      );
      this.salvando.set(false);
    }
  }

  /* ============================================================
   * INATIVAR / REATIVAR (US-12)
   * Não há exclusão física — apenas alternância do campo `ativo`,
   * preservando o histórico da turma.
   * ============================================================ */
  mostrarModalStatus = signal(false);
  turmaSelecionadaStatus = signal<TurmaResponseDTO | null>(null);
  alterandoStatus = signal(false);

  abrirModalStatus(turma: TurmaResponseDTO): void {
    this.turmaSelecionadaStatus.set(turma);
    this.mostrarModalStatus.set(true);
  }

  fecharModalStatus(): void {
    this.mostrarModalStatus.set(false);
    this.turmaSelecionadaStatus.set(null);
  }

  async confirmarAlteracaoStatus(): Promise<void> {
    const turma = this.turmaSelecionadaStatus();
    if (!turma || this.alterandoStatus()) {
      return;
    }

    const dto: TurmaStatusRequestDTO = { ativo: !turma.ativo };

    this.alterandoStatus.set(true);

    try {
      await firstValueFrom(
        this.http.patch<TurmaResponseDTO>(`${this.apiTurmas}/${turma.turmaId}/status`, dto),
      );
      this.alterandoStatus.set(false);
      this.fecharModalStatus();
      this.carregarTurmas();
    } catch (erro) {
      console.error('Erro ao alterar status da turma:', erro);
      this.alterandoStatus.set(false);
      // mantém o modal aberto pra o usuário poder tentar de novo
    }
  }
  
}

