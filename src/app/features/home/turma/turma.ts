import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
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
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
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
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { AlunosTurmaModal } from './alunos-turma-modal/alunos-turma-modal';
import { HistoricoOficineiros } from '../../../shared/components/historico-oficineiros/historico-oficineiros';
import { OficineiroHistoricoDTO } from '../../../shared/models/historico/OficineiroHistoricoDTO';

@Component({
  selector: 'app-turmas',
  standalone: true,
  imports: [AlunosTurmaModal, HistoricoOficineiros, Icon, SeletorDiasSemana, 
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

  readonly colunasTurmas: TableColumn<TurmaResponseDTO>[] = [
    { key: 'nomeTurma', header: 'Nome da turma', sortable: true },
    { key: 'oficina', header: 'Oficina', value: (t) => this.nomeOficina(t) },
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

  nomeOficina(turma: TurmaResponseDTO): string {
    if (!turma.oficinaId) return '-';
    return this.oficinasPorId().get(turma.oficinaId)?.nomeOficina ?? '-';
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

  /**
   * O perfil do usuário pode chegar depois do ngOnInit (ex.: F5 direto na
   * página) — por isso a lista de oficineiros carrega quando o perfil vira
   * Coordenador, e não só no init (antes o select ficava vazio).
   */
  private oficineirosCarregados = false;
  private readonly carregarOficineirosQuandoCoordenador = effect(() => {
    if (this.isCoordenador() && !this.oficineirosCarregados) {
      this.oficineirosCarregados = true;
      this.carregarOficineirosParaSelect();
    }
  });

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
  /** O drawer mostra a lista de ações ou o histórico de oficineiros da turma. */
  drawerVisao = signal<'acoes' | 'historico'>('acoes');

  readonly abrirDrawerTurma = (turma: TurmaResponseDTO): void => {
    this.drawerVisao.set('acoes');
    this.turmaDrawerAberta.set(turma);
  };

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
        this.erroListar.set('Não foi possível carregar as turmas.');
        this.carregando.set(false);
      },
    });
  }

  /* ============================================================
   * OFICINAS — lista completa (nomes p/ coluna + calendário) e o
   * recorte de ativas p/ o select de criar/editar turma.
   * ============================================================ */
  oficinas = signal<OficinaResponseDTO[]>([]);
  oficinaOptions = computed<SelectOption<number>[]>(() =>
    this.oficinas()
      .filter((o) => o.ativo)
      .map((o) => ({ value: o.oficinaId, label: o.nomeOficina })),
  );
  oficineiroOptions = signal<SelectOption<number>[]>([]);

  private carregarOficinas(): void {
    this.http.get<OficinaResponseDTO[]>(this.apiOficinas).subscribe({
      next: (lista) => this.oficinas.set(lista),
      error: (erro) => console.error('Erro ao carregar oficinas:', erro),
    });
  }

  /**
   * O select só lista oficineiros ATIVOS. Se o atual da turma foi inativado,
   * ele não aparece e o campo fica em branco — então busca o nome dele no
   * histórico e inclui como opção "(inativo)", para dar pra ver e trocar.
   */
  private garantirOficineiroAtualNasOpcoes(turma: TurmaResponseDTO): void {
    const atualId = turma.oficineiroResponsavelId;
    if (atualId == null || this.oficineiroOptions().some((o) => o.value === atualId)) return;
    this.http
      .get<OficineiroHistoricoDTO[]>(`${this.apiTurmas}/${turma.turmaId}/oficineiros-historico`)
      .subscribe({
        next: (historico) => {
          const atual = historico.find((h) => h.oficineiroId === atualId);
          if (atual && !this.oficineiroOptions().some((o) => o.value === atualId)) {
            this.oficineiroOptions.update((opcoes) => [
              ...opcoes,
              { value: atualId, label: `${atual.nomeOficineiro} (inativo)` },
            ]);
          }
        },
        error: () => {},
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
      oficinaId: null,
      oficineiroResponsavelId: null,
      diasDaSemana: [],
    };
  }

  abrirModalNovaTurma(): void {
    this.turmaEmEdicao.set(null);
    this.formTurma = this.turmaVazia();
    this.erroSalvar.set(null);
    this.mostrarModalForm.set(true);
  }

  abrirModalEditarTurma(turma: TurmaResponseDTO): void {
    this.garantirOficineiroAtualNasOpcoes(turma);
    this.turmaEmEdicao.set(turma);
    this.formTurma = {
      nomeTurma: turma.nomeTurma,
      turno: turma.turno,
      faixaEtaria: turma.faixaEtaria,
      capacidade: turma.capacidade,
      observacoes: turma.observacoes ?? '',
      oficinaId: turma.oficinaId ?? null,
      oficineiroResponsavelId: turma.oficineiroResponsavelId ?? null,
      diasDaSemana: turma.diasDaSemana ?? [],
    };
    this.erroSalvar.set(null);
    this.mostrarModalForm.set(true);
  }

  fecharModalForm(): void {
    this.mostrarModalForm.set(false);
  }

  atualizarCampoTurma(campo: keyof TurmaRequestDTO, valor: string | number | DiaSemana[] | null): void {
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

    if (this.formTurma.oficinaId == null) {
      this.erroSalvar.set('Selecione a oficina.');
      return;
    }

    if (this.formTurma.oficineiroResponsavelId == null) {
      this.erroSalvar.set('Selecione o oficineiro responsável.');
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
        mensagemErro(erro, 'Não foi possível salvar a turma. Verifique os dados e tente novamente.'),
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
      this.erroVincularAlunos.set('Não foi possível carregar os assistidos disponíveis.');
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
      this.erroVincularAlunos.set('Selecione pelo menos um assistido.');
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
        mensagemErro(erro, 'Não foi possível vincular os assistidos selecionados. Tente novamente.'),
      );
      this.vinculandoAlunos.set(false);
    }
  }
}

