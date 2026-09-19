import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { Turno, TURNOS_DISPONIVEIS } from '../../../shared/enum/Turno';
import { Role } from '../../../shared/enum/role.enum';

import { TurmaRequestDTO } from '../../../shared/models/turma/TurmaRequestDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { TurmaStatusRequestDTO } from '../../../shared/models/turma/TurmaStatusRequestDTO';
import { CriacaoAulasRequestDTO, DiaDaSemana } from '../../../shared/models/aula/CriacaoAulasRequestDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Modal } from '../../../shared/components/modal/modal';
import { Table, TableColumn } from '../../../shared/components/table/table';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-turmas',
  standalone: true,
  imports: [CommonModule, FormsModule, Select, Modal, Table],
  templateUrl: './turma.html',
  styleUrl: './turma.css',
})
export class Turmas implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly apiTurmas = `${environment.apiUrl}/api/turmas`;
  private readonly apiAulas = `${environment.apiUrl}/api/aulas`;
  private readonly apiOficinas = `${environment.apiUrl}/api/oficinas`;
  private readonly apiUsuarios = `${environment.apiUrl}/api/usuarios`;

  Turno = Turno;
  turnosDisponiveis = TURNOS_DISPONIVEIS;

  /**
   * Só Coordenador pode criar/editar turma e ver o select de oficineiro
   * (Sociopedagógico não tem acesso ao GET /api/usuarios no back, então
   * nem tentamos chamá-lo pra esse perfil - CA acordado com o usuário).
   */
  isCoordenador = computed(() => this.authService.currentProfile() === Role.COORD);

  turnoOptions: SelectOption<string>[] = this.turnosDisponiveis.map(t => ({
    value: t,
    label: t
  }));

  filtroTurnoOptions: SelectOption<string>[] = [
    { value: '', label: 'Todos os turnos' },
    ...this.turnosDisponiveis.map(t => ({ value: t, label: t }))
  ];

  filtroStatusOptions: SelectOption<'todas' | 'ativas' | 'inativas'>[] = [
    { value: 'ativas', label: 'Ativas' },
    { value: 'inativas', label: 'Inativas' },
    { value: 'todas', label: 'Todas' }
  ];

  faixaEtariaOptions: SelectOption<string>[] = [
    { value: '6–9 anos', label: '6–9 anos' },
    { value: '10–13 anos', label: '10–13 anos' },
    { value: '14–17 anos', label: '14–17 anos' }
  ];

  turmas = signal<TurmaResponseDTO[]>([]);
  carregando = signal(false);
  erroListar = signal<string | null>(null);

  /** Aviso não-bloqueante mostrado depois de fechar o modal (ex.: turma criada mas aulas falharam). */
  avisoPosCriacao = signal<string | null>(null);

  readonly colunasTurmas: TableColumn<TurmaResponseDTO>[] = [
    { key: 'nomeTurma', header: 'Nome da turma', sortable: true },
    { key: 'turno', header: 'Turno', sortable: true },
    { key: 'faixaEtaria', header: 'Faixa etária', value: (t) => t.faixaEtaria || '—' },
    { key: 'capacidade', header: 'Capacidade', align: 'center' },
    { key: 'ativo', header: 'Status', type: 'badge', width: '140px' },
  ];

  protected readonly trackByTurmaId = (turma: TurmaResponseDTO) => turma.turmaId;

  filtroNome = '';
  filtroTurno: Turno | '' = '';
  filtroStatus: 'todas' | 'ativas' | 'inativas' = 'ativas';

  private debounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.carregarTurmas();
    this.carregarOficinasParaSelect();

    if (this.isCoordenador()) {
      this.carregarOficineirosParaSelect();
    }
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
   * SELECTS: OFICINA E OFICINEIRO RESPONSÁVEL
   * ============================================================ */
  oficinaOptions = signal<SelectOption<number>[]>([]);
  oficineiroOptions = signal<SelectOption<number>[]>([]);

  private carregarOficinasParaSelect(): void {
    this.http
      .get<OficinaResponseDTO[]>(this.apiOficinas, { params: new HttpParams().set('ativo', 'true') })
      .subscribe({
        next: (lista) => {
          this.oficinaOptions.set(lista.map((o) => ({ value: o.oficinaId, label: o.nomeOficina })));
        },
        error: (erro) => console.error('Erro ao carregar oficinas para seleção:', erro),
      });
  }

  private carregarOficineirosParaSelect(): void {
    this.http.get<UsuarioResponse[]>(`${this.apiUsuarios}/oficineiros`).subscribe({
      next: (lista) => {
        this.oficineiroOptions.set(lista.map((u) => ({ value: u.usuarioId, label: u.nomeCompleto })));
      },
      error: (erro) => console.error('Erro ao carregar oficineiros para seleção:', erro),
    });
  }

  /* ============================================================
   * MODAL: NOVA / EDITAR TURMA (US-09 e US-11)
   * O mesmo modal atende os dois casos: se turmaEmEdicao() tiver
   * valor, é um PUT; caso contrário, é um POST.
   *
   * Tem duas abas: "Turma" (dados da turma + oficina/oficineiro) e
   * "Aulas" (só na criação - mesmo modelo do "Criar várias aulas").
   * ============================================================ */
  mostrarModalForm = signal(false);
  salvando = signal(false);
  erroSalvar = signal<string | null>(null);
  turmaEmEdicao = signal<TurmaResponseDTO | null>(null);

  abaAtivaForm = signal<'turma' | 'aulas'>('turma');

  formTurma: TurmaRequestDTO = this.turmaVazia();

  private turmaVazia(): TurmaRequestDTO {
    return {
      nomeTurma: '',
      turno: '',
      faixaEtaria: '',
      capacidade: null,
      observacoes: '',
      oficinaId: null,
      oficineiroResponsavelId: null,
    };
  }

  abrirModalNovaTurma(): void {
    this.turmaEmEdicao.set(null);
    this.formTurma = this.turmaVazia();
    this.formAulasTurma = this.aulasNovaTurmaVazia();
    this.comTituloDescricao.set(true);
    this.abaAtivaForm.set('turma');
    this.erroSalvar.set(null);
    this.erroAulasTurma.set(null);
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
      oficinaId: turma.oficinaId ?? null,
      oficineiroResponsavelId: turma.oficineiroResponsavelId ?? null,
    };
    this.abaAtivaForm.set('turma');
    this.erroSalvar.set(null);
    this.mostrarModalForm.set(true);
  }

  fecharModalForm(): void {
    this.mostrarModalForm.set(false);
  }

  atualizarCampoTurma(campo: keyof TurmaRequestDTO, valor: string | number | null): void {
    this.formTurma = { ...this.formTurma, [campo]: valor };
    // Limpa o erro assim que o usuário mexe em algum campo, pra não ficar
    // uma mensagem de validação "presa" na tela depois que ele já corrigiu
    // o que faltava (ela só seria atualizada de novo no próximo clique em
    // "Salvar", o que confundia o usuário fazendo parecer que o campo
    // preenchido continuava "errado").
    if (this.erroSalvar()) {
      this.erroSalvar.set(null);
    }
  }

  /* ---- Aba "Aulas" do modal de nova turma ---- */
  formAulasTurma: CriacaoAulasRequestDTO = this.aulasNovaTurmaVazia();
  comTituloDescricao = signal(true);
  erroAulasTurma = signal<string | null>(null);

  private aulasNovaTurmaVazia(): CriacaoAulasRequestDTO {
    return {
      turmaId: 0,
      dataInicio: '',
      dataFim: '',
      diasDaSemana: [],
      horarioInicio: '',
      horarioFim: '',
      titulo: '',
      descricao: '',
      conteudoPrevisto: '',
      objetivos: '',
      recursosNecessarios: '',
      observacoes: '',
    };
  }

  atualizarCampoAulasTurma(campo: keyof CriacaoAulasRequestDTO, valor: any): void {
    this.formAulasTurma = { ...this.formAulasTurma, [campo]: valor };
    if (this.erroAulasTurma()) {
      this.erroAulasTurma.set(null);
    }
  }

  toggleDiaSemanaNovaTurma(dia: DiaDaSemana): void {
    const dias = this.formAulasTurma.diasDaSemana;
    const index = dias.indexOf(dia);
    if (index > -1) {
      this.formAulasTurma.diasDaSemana = dias.filter((d) => d !== dia);
    } else {
      this.formAulasTurma.diasDaSemana = [...dias, dia];
    }
  }

  definirComTituloDescricao(): void {
    this.comTituloDescricao.set(true);
  }

  definirSemTituloDescricao(): void {
    this.comTituloDescricao.set(false);
    this.formAulasTurma = { ...this.formAulasTurma, titulo: '', descricao: '' };
  }

  /** 'vazio' = aba não tocada; 'parcial' = faltam campos; 'completo' = pronto pra criar as aulas. */
  private estadoAbaAulas(): 'vazio' | 'parcial' | 'completo' {
    const f = this.formAulasTurma;
    const algumPreenchido = !!f.dataInicio || !!f.dataFim || !!f.horarioInicio || !!f.horarioFim || f.diasDaSemana.length > 0;

    if (!algumPreenchido) {
      return 'vazio';
    }

    const completo = !!f.dataInicio && !!f.dataFim && !!f.horarioInicio && !!f.horarioFim && f.diasDaSemana.length > 0;
    return completo ? 'completo' : 'parcial';
  }

  /* ---- Confirmação de criar turma sem aulas ---- */
  mostrarConfirmacaoSemAulas = signal(false);

  confirmarCriarSemAulas(): void {
    this.mostrarConfirmacaoSemAulas.set(false);
    this.executarSalvarTurma(false);
  }

  cancelarCriarSemAulas(): void {
    this.mostrarConfirmacaoSemAulas.set(false);
    this.abaAtivaForm.set('aulas');
  }

  async salvarTurma(): Promise<void> {
    if (this.salvando()) {
      return;
    }

    if (!this.formTurma.nomeTurma.trim()) {
      this.abaAtivaForm.set('turma');
      this.erroSalvar.set('Informe o nome da turma.');
      return;
    }

    if (!this.formTurma.turno) {
      this.abaAtivaForm.set('turma');
      this.erroSalvar.set('Selecione o turno.');
      return;
    }

    if (!this.formTurma.capacidade || this.formTurma.capacidade <= 0) {
      this.abaAtivaForm.set('turma');
      this.erroSalvar.set('Informe uma capacidade válida.');
      return;
    }

    if (this.formTurma.oficinaId == null) {
      this.abaAtivaForm.set('turma');
      this.erroSalvar.set('Selecione a oficina.');
      return;
    }

    if (this.formTurma.oficineiroResponsavelId == null) {
      this.abaAtivaForm.set('turma');
      this.erroSalvar.set('Selecione o oficineiro responsável.');
      return;
    }

    this.erroSalvar.set(null);

    // Edição: não mexe em aulas, só salva os dados da turma.
    if (this.turmaEmEdicao()) {
      await this.executarSalvarTurma(false);
      return;
    }

    // Criação: decide o que fazer com a aba "Aulas".
    const estadoAulas = this.estadoAbaAulas();

    if (estadoAulas === 'parcial') {
      this.abaAtivaForm.set('aulas');
      this.erroAulasTurma.set(
        'Preencha todos os campos obrigatórios das aulas (datas, dias da semana e horários) ou deixe a aba "Aulas" totalmente em branco para criar a turma sem aulas.',
      );
      return;
    }

    if (estadoAulas === 'vazio') {
      this.mostrarConfirmacaoSemAulas.set(true);
      return;
    }

    await this.executarSalvarTurma(true);
  }

  private async executarSalvarTurma(comAulas: boolean): Promise<void> {
    this.salvando.set(true);
    this.erroSalvar.set(null);
    this.erroAulasTurma.set(null);

    const emEdicao = this.turmaEmEdicao();

    try {
      const turmaResultado = emEdicao
        ? await firstValueFrom(
            this.http.put<TurmaResponseDTO>(`${this.apiTurmas}/${emEdicao.turmaId}`, this.formTurma),
          )
        : await firstValueFrom(this.http.post<TurmaResponseDTO>(this.apiTurmas, this.formTurma));

      if (comAulas) {
        const payloadAulas: CriacaoAulasRequestDTO = {
          ...this.formAulasTurma,
          turmaId: turmaResultado.turmaId,
        };

        if (!this.comTituloDescricao()) {
          delete payloadAulas.titulo;
          delete payloadAulas.descricao;
        }

        try {
          const criouAlgumaAula = await firstValueFrom(
            this.http.post<boolean>(`${this.apiAulas}/varias-aulas`, payloadAulas),
          );

          if (!criouAlgumaAula) {
            // O back respondeu 200 normalmente, mas não criou nenhuma aula
            // (ex.: nenhuma data do período cai nos dias da semana
            // escolhidos). Sem esse aviso o usuário via a turma sendo
            // criada e achava que as aulas também tinham sido, quando na
            // verdade nenhuma foi.
            this.salvando.set(false);
            this.fecharModalForm();
            this.carregarTurmas();
            this.avisoPosCriacao.set(
              `A turma "${this.formTurma.nomeTurma}" foi criada, mas nenhuma aula foi criada: nenhuma data do ` +
                'período informado cai nos dias da semana escolhidos. Use a ação "Criar várias aulas" na lista ' +
                'para tentar novamente com outro período ou dias.',
            );
            return;
          }
        } catch (erroAulas: any) {
          console.error('Erro ao criar aulas da nova turma:', erroAulas);
          this.salvando.set(false);
          this.fecharModalForm();
          this.carregarTurmas();
          this.avisoPosCriacao.set(
            `A turma "${this.formTurma.nomeTurma}" foi criada, mas não foi possível criar as aulas automaticamente. ` +
              'Use a ação "Criar várias aulas" na lista para tentar novamente.',
          );
          return;
        }
      }

      this.salvando.set(false);
      this.fecharModalForm();
      this.carregarTurmas();
    } catch (erro: any) {
      console.error('Erro ao salvar turma:', erro);
      this.abaAtivaForm.set('turma');
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

  /* ============================================================
   * CRIAR VÁRIAS AULAS (ação por turma já existente, na tabela)
   * ============================================================ */
  mostrarModalCriarAulas = signal(false);
  salvandoAulas = signal(false);
  erroSalvarAulas = signal<string | null>(null);
  formCriarAulas: CriacaoAulasRequestDTO = this.criacaoAulasVazia();

  private criacaoAulasVazia(): CriacaoAulasRequestDTO {
    return {
      turmaId: 0,
      dataInicio: '',
      dataFim: '',
      diasDaSemana: [],
      horarioInicio: '',
      horarioFim: '',
      titulo: '',
      descricao: '',
      conteudoPrevisto: '',
      objetivos: '',
      recursosNecessarios: '',
      observacoes: '',
    };
  }

  abrirModalCriarAulas(turma: TurmaResponseDTO): void {
    this.formCriarAulas = {
      ...this.criacaoAulasVazia(),
      turmaId: turma.turmaId,
    };
    this.erroSalvarAulas.set(null);
    this.mostrarModalCriarAulas.set(true);
  }

  fecharModalCriarAulas(): void {
    this.mostrarModalCriarAulas.set(false);
  }

  atualizarCampoCriarAulas(campo: keyof CriacaoAulasRequestDTO, valor: any): void {
    this.formCriarAulas = { ...this.formCriarAulas, [campo]: valor };
  }

  toggleDiaSemana(dia: DiaDaSemana): void {
    const dias = this.formCriarAulas.diasDaSemana;
    const index = dias.indexOf(dia);
    if (index > -1) {
      this.formCriarAulas.diasDaSemana = dias.filter((d) => d !== dia);
    } else {
      this.formCriarAulas.diasDaSemana = [...dias, dia];
    }
  }

  async salvarCriarAulas(): Promise<void> {
    if (this.salvandoAulas()) {
      return;
    }

    if (!this.formCriarAulas.turmaId) {
      this.erroSalvarAulas.set('Selecione uma turma.');
      return;
    }

    if (!this.formCriarAulas.dataInicio) {
      this.erroSalvarAulas.set('Informe a data de início.');
      return;
    }

    if (!this.formCriarAulas.dataFim) {
      this.erroSalvarAulas.set('Informe a data de fim.');
      return;
    }

    if (!this.formCriarAulas.diasDaSemana || this.formCriarAulas.diasDaSemana.length === 0) {
      this.erroSalvarAulas.set('Selecione pelo menos um dia da semana.');
      return;
    }

    if (!this.formCriarAulas.horarioInicio) {
      this.erroSalvarAulas.set('Informe o horário de início.');
      return;
    }

    if (!this.formCriarAulas.horarioFim) {
      this.erroSalvarAulas.set('Informe o horário de fim.');
      return;
    }

    this.salvandoAulas.set(true);
    this.erroSalvarAulas.set(null);

    try {
      const criouAlgumaAula = await firstValueFrom(
        this.http.post<boolean>(`${this.apiAulas}/varias-aulas`, this.formCriarAulas),
      );
      this.salvandoAulas.set(false);

      if (!criouAlgumaAula) {
        this.erroSalvarAulas.set(
          'Nenhuma aula foi criada: nenhuma data no período informado cai nos dias da semana ' +
            'escolhidos (ou as aulas dessas datas já existiam para esta turma).',
        );
        return;
      }

      this.fecharModalCriarAulas();
    } catch (erro: any) {
      console.error('Erro ao criar aulas:', erro);
      this.erroSalvarAulas.set(
        erro?.error?.message ?? 'Não foi possível criar as aulas. Verifique os dados e tente novamente.',
      );
      this.salvandoAulas.set(false);
    }
  }

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
