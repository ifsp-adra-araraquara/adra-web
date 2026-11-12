import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { Turno, TURNOS_DISPONIVEIS } from '../../../shared/enum/Turno';
import { DiaSemana } from '../../../shared/enum/DiaSemana';
import { Role } from '../../../shared/enum/role.enum';
import { ocupacaoTurma as ocupacaoTurmaUtil } from '../../../shared/utils/ocupacao.util';

import { TurmaRequestDTO } from '../../../shared/models/turma/TurmaRequestDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { TurmaStatusRequestDTO } from '../../../shared/models/turma/TurmaStatusRequestDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Modal } from '../../../shared/components/modal/modal';
import { Drawer } from '../../../shared/components/drawer/drawer';
import { Table, TableColumn } from '../../../shared/components/table/table';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { TooltipDirective } from '../../../shared/components/tooltip/tooltip';
import { AuthService } from '../../../core/auth.service';
import { Icon } from '../../../shared/components/icon/icon';
import { SeletorDiasSemana } from '../../../shared/components/seletor-dias-semana/seletor-dias-semana';
import { SeletorMultiplo } from '../../../shared/components/seletor-multiplo/seletor-multiplo';
import { ListaBadges } from '../../../shared/components/lista-badges/lista-badges';
import { HistoricoOficineiros } from '../../../shared/components/historico-oficineiros/historico-oficineiros';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { hojeISO } from '../../../shared/utils/aula.util';
import { AlunosTurmaModal } from './alunos-turma-modal/alunos-turma-modal';

@Component({
  selector: 'app-turmas',
  standalone: true,
  imports: [AlunosTurmaModal, Icon, SeletorDiasSemana, SeletorMultiplo, ListaBadges, HistoricoOficineiros, 
    CommonModule,
    FormsModule,
    Select,
    Modal,
    Drawer,
    Table,
    Input,
    Button,
    TooltipDirective,
  ],
  templateUrl: './turma.html',
  styleUrl: './turma.css',
})
export class Turmas implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly apiTurmas = `${environment.apiUrl}/api/turmas`;
  private readonly apiOficinas = `${environment.apiUrl}/api/oficinas`;

  Turno = Turno;
  turnosDisponiveis = TURNOS_DISPONIVEIS;

  /**
   * Só Coordenador pode criar/editar turma e ver o select de oficineiro
   * (Educador Social não tem acesso ao GET /api/usuarios no back, então
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

  /** Faixas que a ADRA usa (e-mail de 11/11). */
  private readonly faixasEtarias: SelectOption<string>[] = [
    { value: '6 a 10 anos', label: '6 a 10 anos' },
    { value: '11 a 13 anos', label: '11 a 13 anos' },
    { value: '14 a 17 anos', label: '14 a 17 anos' }
  ];
  /** Grupo com uma faixa antiga: ela aparece como opção até ser trocada. */
  private readonly faixaAntiga = signal<string | null>(null);
  readonly faixaEtariaOptions = computed<SelectOption<string>[]>(() => {
    const antiga = this.faixaAntiga();
    return antiga ? [...this.faixasEtarias, { value: antiga, label: `${antiga} (antiga)` }] : this.faixasEtarias;
  });

  turmas = signal<TurmaResponseDTO[]>([]);
  carregando = signal(false);
  erroListar = signal<string | null>(null);

  readonly colunasTurmas: TableColumn<TurmaResponseDTO>[] = [
    { key: 'nomeTurma', header: 'Nome do grupo', sortable: true },
    { key: 'oficinas', header: 'Oficinas', type: 'custom' },
    { key: 'turno', header: 'Turno', sortable: true },
    { key: 'faixaEtaria', header: 'Faixa etária', value: (t) => t.faixaEtaria || '—' },
    { key: 'ocupacao', header: 'Ocupação', align: 'center', type: 'custom', width: '160px' },
    { key: 'ativo', header: 'Status', type: 'badge', width: '140px' },
  ];

  /** Ver `shared/utils/ocupacao.util.ts` — mesma conta reutilizada em `oficineiro.ts`. */
  ocupacaoTurma(turma: TurmaResponseDTO): number {
    return ocupacaoTurmaUtil(turma.quantidadeAlunos, turma.capacidade);
  }

  /** Lookup O(1) por oficinaId — evita um `.find()` em `oficinas()` por linha a cada render da tabela. */
  private readonly oficinasPorId = computed(() => new Map(this.oficinas().map((o) => [o.oficinaId, o])));

  nomesOficinas(turma: TurmaResponseDTO): string[] {
    return turma.oficinaIds
      .map((id) => this.oficinasPorId().get(id)?.nomeOficina)
      .filter((nome): nome is string => !!nome);
  }

  nomeOficina(oficinaId: number): string {
    return this.oficinasPorId().get(oficinaId)?.nomeOficina ?? 'Oficina';
  }

  protected readonly trackByTurmaId = (turma: TurmaResponseDTO) => turma.turmaId;

  filtroNome = '';
  filtroTurno: Turno | '' = '';
  filtroStatus: 'todas' | 'ativas' | 'inativas' = 'ativas';

  private debounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.carregarTurmas();
    this.carregarOficinas();

  }

  /* ============================================================
   * VER ALUNOS / VER FREQUÊNCIA — absorvidos da extinta tela "Aulas"
   * ============================================================ */
  /** Leva à ficha completa do assistido (cadastro, não só nome) já filtrada por essa turma. */
  /** Turma cujo modal "Alunos da turma" está aberto (null = fechado). */
  turmaAlunosModal = signal<TurmaResponseDTO | null>(null);

  verAlunos(turma: TurmaResponseDTO): void {
    this.turmaAlunosModal.set(turma);
  }

  verFrequencia(turma: TurmaResponseDTO): void {
    this.router.navigate(['/chamada/turma', turma.turmaId, 'grade']);
  }

  /**
   * Drawer lateral "Abrir turma" — substitui os ~7 ícones soltos por linha
   * na tabela por um único ponto de entrada com as ações agrupadas. Cada
   * botão do drawer fecha ele antes de acionar a ação (evita empilhar dois
   * overlays — mesma preocupação já registrada no plano pra modais aninhadas).
   */
  turmaDrawerAberta = signal<TurmaResponseDTO | null>(null);
  /** O drawer mostra as ações, as oficinas do grupo ou o histórico de oficineiros delas. */
  drawerVisao = signal<'acoes' | 'oficinas' | 'historico'>('acoes');

  readonly abrirDrawerTurma = (turma: TurmaResponseDTO): void => {
    this.drawerVisao.set('acoes');
    this.turmaDrawerAberta.set(turma);
  };

  /* ============================================================
   * DRAWER: VER OFICINAS — escolhe as oficinas que atendem o grupo.
   * ============================================================ */
  oficinasDoDrawer = signal<number[]>([]);
  salvandoOficinas = signal(false);
  erroOficinas = signal<string | null>(null);

  abrirOficinasDoGrupo(turma: TurmaResponseDTO): void {
    this.oficinasDoDrawer.set([...turma.oficinaIds]);
    this.erroOficinas.set(null);
    this.drawerVisao.set('oficinas');
  }

  async salvarOficinasDoGrupo(turma: TurmaResponseDTO): Promise<void> {
    if (this.salvandoOficinas()) return;
    this.salvandoOficinas.set(true);
    this.erroOficinas.set(null);
    try {
      const atualizada = await firstValueFrom(
        this.http.put<TurmaResponseDTO>(`${this.apiTurmas}/${turma.turmaId}/oficinas`, {
          oficinaIds: this.oficinasDoDrawer(),
        }),
      );
      const comContagem = { ...atualizada, quantidadeAlunos: turma.quantidadeAlunos };
      this.turmas.update((lista) => lista.map((t) => (t.turmaId === turma.turmaId ? comContagem : t)));
      this.turmaDrawerAberta.set(comContagem);
      this.drawerVisao.set('acoes');
    } catch (erro: any) {
      this.erroOficinas.set(mensagemErro(erro, 'Não foi possível salvar as oficinas do grupo.'));
    } finally {
      this.salvandoOficinas.set(false);
    }
  }

  fecharDrawerTurma(): void {
    this.turmaDrawerAberta.set(null);
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
        this.erroListar.set('Não foi possível carregar os grupos.');
        this.carregando.set(false);
      },
    });
  }

  /* ============================================================
   * OFICINAS — lista completa, para os nomes das oficinas do grupo.
   * ============================================================ */
  oficinas = signal<OficinaResponseDTO[]>([]);
  /** Oficinas ativas, para escolher as que atendem o grupo. */
  oficinaOptions = computed<SelectOption<number>[]>(() =>
    this.oficinas()
      .filter((o) => o.ativo)
      .map((o) => ({ value: o.oficinaId, label: o.nomeOficina })),
  );

  private carregarOficinas(): void {
    this.http.get<OficinaResponseDTO[]>(this.apiOficinas).subscribe({
      next: (lista) => this.oficinas.set(lista),
      error: (erro) => console.error('Erro ao carregar oficinas:', erro),
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
      diasDaSemana: [],
      oficinaIds: [],
    };
  }

  abrirModalNovaTurma(): void {
    this.turmaEmEdicao.set(null);
    this.faixaAntiga.set(null);
    this.formTurma = this.turmaVazia();
    this.erroSalvar.set(null);
    this.mostrarModalForm.set(true);
  }

  abrirModalEditarTurma(turma: TurmaResponseDTO): void {
    this.turmaEmEdicao.set(turma);
    this.faixaAntiga.set(
      turma.faixaEtaria && !this.faixasEtarias.some((f) => f.value === turma.faixaEtaria) ? turma.faixaEtaria : null,
    );
    this.formTurma = {
      nomeTurma: turma.nomeTurma,
      turno: turma.turno,
      faixaEtaria: turma.faixaEtaria,
      capacidade: turma.capacidade,
      observacoes: turma.observacoes ?? '',
      diasDaSemana: turma.diasDaSemana ?? [],
      oficinaIds: [...turma.oficinaIds],
    };
    this.erroSalvar.set(null);
    this.mostrarModalForm.set(true);
  }

  fecharModalForm(): void {
    this.mostrarModalForm.set(false);
  }

  atualizarCampoTurma(campo: keyof TurmaRequestDTO, valor: string | number | DiaSemana[] | number[] | null): void {
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

  async salvarTurma(): Promise<void> {
    if (this.salvando()) {
      return;
    }

    if (!this.formTurma.nomeTurma.trim()) {
      this.erroSalvar.set('Informe o nome do grupo.');
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
        mensagemErro(erro, 'Não foi possível salvar o grupo. Verifique os dados e tente novamente.'),
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

  /* ============================================================
   * CORRIGIR DATA DE ENTRADA (e-mail da ADRA de 11/11)
   * Os vínculos feitos depois do início das atividades começavam no dia em
   * que foram feitos, e a chamada dos dias anteriores vinha vazia. O
   * Coordenador corrige de uma vez: PATCH /api/turmas/{id}/vinculos/data-entrada.
   * ============================================================ */
  readonly hoje = hojeISO();
  mostrarCorrecaoEntrada = signal(false);
  turmaCorrecaoEntrada = signal<TurmaResponseDTO | null>(null);
  dataCorrecaoEntrada = signal(hojeISO().slice(0, 8) + '01');
  corrigindoEntrada = signal(false);
  erroCorrecaoEntrada = signal<string | null>(null);
  resultadoCorrecaoEntrada = signal<number | null>(null);

  abrirCorrecaoEntrada(turma: TurmaResponseDTO): void {
    this.turmaCorrecaoEntrada.set(turma);
    this.dataCorrecaoEntrada.set(this.hoje.slice(0, 8) + '01');
    this.erroCorrecaoEntrada.set(null);
    this.resultadoCorrecaoEntrada.set(null);
    this.mostrarCorrecaoEntrada.set(true);
  }

  fecharCorrecaoEntrada(): void {
    this.mostrarCorrecaoEntrada.set(false);
    this.turmaCorrecaoEntrada.set(null);
  }

  async confirmarCorrecaoEntrada(): Promise<void> {
    const turma = this.turmaCorrecaoEntrada();
    const data = this.dataCorrecaoEntrada();
    if (!turma || this.corrigindoEntrada()) return;
    if (!data) {
      this.erroCorrecaoEntrada.set('Informe a data.');
      return;
    }
    if (data > this.hoje) {
      this.erroCorrecaoEntrada.set('A data não pode ser no futuro.');
      return;
    }
    this.corrigindoEntrada.set(true);
    this.erroCorrecaoEntrada.set(null);
    try {
      const { corrigidos } = await firstValueFrom(
        this.http.patch<{ corrigidos: number }>(`${this.apiTurmas}/${turma.turmaId}/vinculos/data-entrada`, {
          dataEntrada: data,
        }),
      );
      this.resultadoCorrecaoEntrada.set(corrigidos);
    } catch (erro) {
      this.erroCorrecaoEntrada.set(mensagemErro(erro as HttpErrorResponse, 'Não foi possível corrigir. Tente novamente.'));
    } finally {
      this.corrigindoEntrada.set(false);
    }
  }

  /* ============================================================
   * VINCULAR ALUNOS ("+"  na tabela de turmas)
   * Abre um modal pra selecionar assistidos ativos que ainda não estão
   * nessa turma e vincula todos de uma vez via POST /api/turmas/{id}/alunos
   * (cria o histórico em turma_aluno, que é o que a chamada/CA-65 usa como
   * roster — ver ChamadaService no back).
   * ============================================================ */
  mostrarModalVincularAlunos = signal(false);
  turmaVincularAlunos = signal<TurmaResponseDTO | null>(null);
  carregandoCandidatos = signal(false);
  erroVincularAlunos = signal<string | null>(null);
  vinculandoAlunos = signal(false);
  candidatosVincular = signal<AssistidoResponseDTO[]>([]);
  buscaCandidato = signal('');
  private assistidosSelecionados = signal<Set<number>>(new Set());

  protected readonly candidatosFiltrados = computed(() => {
    const termo = this.buscaCandidato().trim().toLowerCase();
    if (!termo) return this.candidatosVincular();
    return this.candidatosVincular().filter((a) => a.nomeCompleto.toLowerCase().includes(termo));
  });

  protected estaSelecionado(assistidoId: number): boolean {
    return this.assistidosSelecionados().has(assistidoId);
  }

  toggleSelecaoAssistido(assistidoId: number): void {
    const atual = new Set(this.assistidosSelecionados());
    if (atual.has(assistidoId)) {
      atual.delete(assistidoId);
    } else {
      atual.add(assistidoId);
    }
    this.assistidosSelecionados.set(atual);
  }

  async abrirModalVincularAlunos(turma: TurmaResponseDTO): Promise<void> {
    this.turmaVincularAlunos.set(turma);
    this.buscaCandidato.set('');
    this.assistidosSelecionados.set(new Set());
    this.erroVincularAlunos.set(null);
    this.candidatosVincular.set([]);
    this.mostrarModalVincularAlunos.set(true);
    this.carregandoCandidatos.set(true);

    try {
      const [jaVinculados, pagina] = await Promise.all([
        firstValueFrom(this.http.get<AssistidoResponseDTO[]>(`${this.apiTurmas}/${turma.turmaId}/alunos`)),
        firstValueFrom(
          this.http.get<PaginaResponse<AssistidoResponseDTO>>(
            `${environment.apiUrl}/api/assistidos`,
            { params: { status: 'ATIVO', tamanho: '500' } },
          ),
        ),
      ]);

      const idsJaVinculados = new Set(jaVinculados.map((a) => a.assistidoId));
      this.candidatosVincular.set(
        pagina.conteudo
          .filter((a) => !idsJaVinculados.has(a.assistidoId))
          .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
      );
    } catch (erro) {
      console.error('Erro ao carregar assistidos para vincular:', erro);
      this.erroVincularAlunos.set('Não foi possível carregar os atendidos disponíveis.');
    } finally {
      this.carregandoCandidatos.set(false);
    }
  }

  fecharModalVincularAlunos(): void {
    this.mostrarModalVincularAlunos.set(false);
    this.turmaVincularAlunos.set(null);
  }

  async confirmarVincularAlunos(): Promise<void> {
    const turma = this.turmaVincularAlunos();
    const assistidoIds = Array.from(this.assistidosSelecionados());

    if (!turma || this.vinculandoAlunos()) return;

    if (assistidoIds.length === 0) {
      this.erroVincularAlunos.set('Selecione pelo menos um atendido.');
      return;
    }

    this.vinculandoAlunos.set(true);
    this.erroVincularAlunos.set(null);

    try {
      await firstValueFrom(
        this.http.post(`${this.apiTurmas}/${turma.turmaId}/alunos`, { assistidoIds }),
      );
      this.vinculandoAlunos.set(false);
      this.fecharModalVincularAlunos();
    } catch (erro: any) {
      console.error('Erro ao vincular alunos à turma:', erro);
      this.erroVincularAlunos.set(
        mensagemErro(erro, 'Não foi possível vincular os atendidos selecionados. Tente novamente.'),
      );
      this.vinculandoAlunos.set(false);
    }
  }
}

