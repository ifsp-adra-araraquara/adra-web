import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { AuthService } from '../../../core/auth.service';
import { Role } from '../../../shared/enum/role.enum';
import { StatusGeral } from '../../../shared/enum/StatusGeral';
import { StatusPresenca } from '../../../shared/enum/StatusPresenca';

import { AssistidoRequestDTO } from '../../../shared/models/assistido/AssistidoRequestDTO';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { AssistidoStatusRequestDTO } from '../../../shared/models/assistido/AssistidoStatusRequestDTO';
import { AssistidoContagemDTO } from '../../../shared/models/assistido/AssistidoContagemDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { formatarTelefone } from '../../../shared/utils/mascara.util';
import { cliqueEmElementoInterativo } from '../../../shared/utils/clique.util';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { VinculoTurmaAssistidoResponseDTO } from '../../../shared/models/turma/VinculoTurmaAssistidoResponseDTO';
import { FrequenciaAulaDTO } from '../../../shared/models/presenca/FrequenciaAulaDTO';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { ChamadaService } from '../../../core/chamada.service';

import { ResponsavelRequestDTO } from '../../../shared/models/responsavel/ResponsavelRequestDTO';
import { VinculoFamiliarComResponsavelRequestDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarComResponsavelRequestDTO';
import { VinculoFamiliarRequestDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarRequestDTO';
import { VinculoFamiliarResponseDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarResponseDTO';
import { ResponsavelResponseDTO } from '../../../shared/models/responsavel/ResponsavelResponseDTO';

import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { cpfValido, telefoneValido } from '../../../shared/validators/cpf.validator';
import { Modal } from '../../../shared/components/modal/modal';
import { Badge } from '../../../shared/components/badge/badge';
import { AulasTurmaModal } from '../aulas-turma-modal/aulas-turma-modal';
import { Icon } from '../../../shared/components/icon/icon';
import { TooltipDirective } from '../../../shared/components/tooltip/tooltip';
import { ActionMenu, ActionMenuItem } from '../../../shared/components/action-menu/action-menu';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { FotoPerfil } from '../../../shared/components/foto-perfil/foto-perfil';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { UploadDocumento } from '../../../shared/components/upload-documento/upload-documento';
import { ListaDocumentos } from '../../../shared/components/lista-documentos/lista-documentos';
import { ArquivoService } from '../../../core/arquivo.service';
import { AssistidoService } from '../../../core/assistido.service';
import { MENSAGEM_SEM_DOCUMENTO } from './mensagens-cadastro';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { SEXO_LABELS, Sexo } from '../../../shared/enum/Sexo';
import { ESCOLARIDADE_LABELS, Escolaridade } from '../../../shared/enum/Escolaridade';
import { ESTADO_CIVIL_LABELS, EstadoCivil } from '../../../shared/enum/EstadoCivil';
import { EnderecoDTO } from '../../../shared/models/endereco/EnderecoDTO';
import { enderecoParaForm, enderecoParaPayload, formatarEndereco } from '../../../shared/utils/endereco.util';
import { formatarMoeda } from '../../../shared/utils/mascara.util';
import { DadosComplementaresAssistidoForm } from './dados-complementares/dados-complementares-assistido';
import { DadosComplementaresResponsavelForm } from '../responsaveis/dados-complementares/dados-complementares-responsavel';
import { SocioeconomicoAssistidoForm } from './socioeconomico/socioeconomico-assistido';
import { TermosAssistidoForm } from './termos/termos-assistido';
import { ElegibilidadeDTO } from '../../../shared/models/assistido/ElegibilidadeDTO';
import {
  PROGRAMA_TRANSFERENCIA_LABELS,
  ProgramaTransferencia,
} from '../../../shared/enum/ProgramaTransferencia';

interface ResponsavelPendente extends ResponsavelRequestDTO {
  parentesco: string;
  responsavelPrincipal: boolean;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
}

@Component({
  selector: 'app-assistidos',
  standalone: true,
  imports: [ActionMenu, TooltipDirective, Icon, CommonModule, FormsModule, Select, Input, Button, Modal, Badge, AulasTurmaModal, FotoPerfil, Avatar, UploadDocumento, ListaDocumentos, DadosComplementaresAssistidoForm, DadosComplementaresResponsavelForm, SocioeconomicoAssistidoForm, TermosAssistidoForm],
  templateUrl: './assistidos.html',
  styleUrl: './assistidos.css',
})
export class Assistidos implements OnInit {
  private http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chamadaService = inject(ChamadaService);
  private readonly arquivoService = inject(ArquivoService);
  private readonly assistidoService = inject(AssistidoService);

  StatusGeral = StatusGeral;
  readonly CategoriaArquivo = CategoriaArquivo;
  readonly formatarEndereco = formatarEndereco;
  readonly formatarMoeda = formatarMoeda;

  private readonly apiAssistidos = `${environment.apiUrl}/api/assistidos`;
  private readonly apiResponsaveis = `${environment.apiUrl}/api/responsaveis`;
  private readonly apiTurmas = `${environment.apiUrl}/api/turmas`;
  private readonly apiOficinas = `${environment.apiUrl}/api/oficinas`;

  /** Aba "Turmas" do modal do assistido (histórico + ver alunos/aulas) é só pro coordenador. */
  readonly ehCoordenador = computed(() => this.auth.currentProfile() === Role.COORD);
  readonly podeEditarCadastro = computed(() => {
    const perfil = this.auth.currentProfile();
    return perfil === Role.COORD || perfil === Role.SOCIO;
  });
  /** Documentos pessoais (RG/CPF) — mesmos perfis que o back libera em /api/arquivos (sem oficineiro). */
  readonly podeVerDocumentos = computed(() => {
    const perfil = this.auth.currentProfile();
    return perfil === Role.ADMIN || perfil === Role.COORD || perfil === Role.SOCIO;
  });

  /* Listagem e Paginação */
  assistidos = signal<AssistidoResponseDTO[]>([]);
  carregando = signal(false);
  pagina = signal(0);
  readonly tamanho = 20;
  totalPaginas = signal(0);
  totalElementos = signal(0);

  temAnterior = computed(() => this.pagina() > 0);
  temProxima = computed(() => this.pagina() < this.totalPaginas() - 1);

  /* Busca e Filtros */
  termoBusca = signal('');
  filtroTurma = signal<number | ''>('');
  filtroOficina = signal<number | ''>('');
  turmas = signal<TurmaResponseDTO[]>([]);
  oficinas = signal<OficinaResponseDTO[]>([]);
  abaAtiva = signal<'todos' | 'ativos' | 'inativos' | 'acomp'>('todos');
  /** Totais das abas — recarregado quando muda busca/turma/oficina (não ao trocar de aba). */
  contagem = signal<AssistidoContagemDTO | null>(null);

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  temFiltrosAtivos = computed(() => {
    return !!this.termoBusca().trim() || this.filtroTurma() !== '' || this.filtroOficina() !== '' || this.abaAtiva() !== 'todos';
  });

  mostrarModalStatus = signal(false);
  assistidoSelecionadoStatus = signal<AssistidoResponseDTO | null>(null);
  novoStatusDesejado = signal<StatusGeral>(StatusGeral.INATIVO);

  abaVerAssistido = signal<'dados' | 'fam' | 'perm' | 'cham' | 'turmas'>('dados');

  trocarAbaVerAssistido(aba: 'dados' | 'fam' | 'perm' | 'cham' | 'turmas') {
    this.abaVerAssistido.set(aba);

    // Carrega o histórico de turmas só na primeira vez que a aba é aberta.
    if (aba === 'turmas' && this.podeEditarCadastro() && this.assistidoSelecionado()) {
      this.carregarHistoricoTurmas(this.assistidoSelecionado()!.assistidoId);
    }

    if (aba === 'cham' && this.assistidoSelecionado()) {
      this.carregarFrequencia(this.assistidoSelecionado()!.assistidoId);
    }
  }

  responsavelEmEdicao = signal<VinculoFamiliarResponseDTO | null>(null);
  formEdicaoResponsavel: ResponsavelPendente = this.responsavelVazio();
  salvandoEdicaoResponsavel = signal(false);
  erroEdicaoResponsavel = signal<string | null>(null);

  mostrarFormNovoResponsavelVinculado = signal(false);
  salvandoResponsavelVinculado = signal(false);
  erroResponsavelVinculado = signal<string | null>(null);
  novoResponsavelVinculado: ResponsavelPendente = this.responsavelVazio();

  /* Modal novo assistido */
  mostrarModalNovo = signal(false);
  salvando = signal(false);
  erroSalvar = signal<string | null>(null);
  alertaDuplicidade = signal(false);
  novoAssistido: AssistidoRequestDTO = this.assistidoVazio();
  /** Foto de perfil já comprimida no navegador (WebP, 512x512). */
  fotoPerfilNovoAssistido = signal<File | null>(null);
  /** Foto do RG ou CPF — obrigatória, 1 arquivo. */
  documentosIdentidadeNovo = signal<File[]>([]);
  /** Liga o destaque vermelho do campo de documento depois da 1ª tentativa de salvar sem ele. */
  tentouSalvarNovo = signal(false);
  turmasAtivas = computed(() => this.turmas().filter((turma) => turma.ativo));

  /** Turmas do filtro restritas à oficina escolhida (quando houver). */
  filtroTurmaOptions = computed<SelectOption<number | ''>[]>(() => {
    const oficinaId = this.filtroOficina();
    const turmas = oficinaId === '' ? this.turmas() : this.turmas().filter((t) => t.oficinaId === oficinaId);
    return [
      { value: '', label: 'Todas as turmas' },
      ...turmas.map((turma) => ({ value: turma.turmaId, label: turma.nomeTurma })),
    ];
  });

  filtroOficinaOptions = computed<SelectOption<number | ''>[]>(() => [
    { value: '', label: 'Todas as oficinas' },
    ...this.oficinas().map((oficina) => ({ value: oficina.oficinaId, label: oficina.nomeOficina })),
  ]);

  turmaNovoAssistidoOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Sem turma' },
    ...this.turmasAtivas().map((turma) => ({ value: turma.turmaId, label: turma.nomeTurma })),
  ]);

  turmaEdicaoOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Sem turma' },
    ...this.turmas().map((turma) => ({ value: turma.turmaId, label: turma.nomeTurma })),
  ]);

  parentescoOptions: SelectOption<string>[] = [
    { value: '', label: 'Selecione' },
    { value: 'Mãe', label: 'Mãe' },
    { value: 'Pai', label: 'Pai' },
    { value: 'Avó/Avô', label: 'Avó/Avô' },
    { value: 'Tio/Tia', label: 'Tio/Tia' },
    { value: 'Responsável legal', label: 'Responsável legal' },
  ];

  private debounceTimerDuplicidade?: ReturnType<typeof setTimeout>;

  /* Modal editar assistido */
  mostrarModalEditar = signal(false);
  secaoEdicao = signal<'dados' | 'turma'>('dados');
  salvandoEdicao = signal(false);
  erroSalvarEdicao = signal<string | null>(null);
  assistidoEmEdicao = signal<AssistidoResponseDTO | null>(null);
  formEdicaoAssistido: AssistidoRequestDTO = this.assistidoVazio();
  /** Nova foto escolhida na edição (null = mantém a atual). */
  fotoPerfilEdicao = signal<File | null>(null);
  /** Novo arquivo do RG/CPF na edição (vazio = mantém o atual). */
  documentosIdentidadeEdicao = signal<File[]>([]);

  /* Responsáveis já salvos e vinculados */
  responsaveisVinculados = signal<ResponsavelPendente[]>([]);
  salvandoResponsavel = signal(false);
  erroResponsavel = signal<string | null>(null);

  /* Sub-fluxo de responsáveis dentro do modal */
  responsaveisPendentes = signal<ResponsavelPendente[]>([]);
  novoResponsavel: ResponsavelPendente = this.responsavelVazio();
  /** Form de responsável do cadastro: some depois de salvar e volta com "Adicionar outro responsável". */
  mostrarFormResponsavelNovo = signal(true);
  /** Índice em `responsaveisVinculados` sendo editado no form (null = incluindo um novo). */
  indiceResponsavelEmEdicaoNovo = signal<number | null>(null);

  ngOnInit(): void {
    this.carregarTurmas();
    this.carregarOficinas();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('turmaId'));
      this.filtroTurma.set(Number.isInteger(id) && id > 0 ? id : '');
      this.recarregarRecorte();
      this.abrirFichaDaUrl(Number(params.get('assistidoId')));
    });
  }

  /** Último ?assistidoId= já aberto — trocar filtros depois não reabre a ficha. */
  private assistidoIdAbertoPelaUrl: number | null = null;

  /** Veio de "Alunos da turma" (clique num aluno): abre a ficha dele direto. */
  private abrirFichaDaUrl(assistidoId: number): void {
    if (!Number.isInteger(assistidoId) || assistidoId <= 0 || assistidoId === this.assistidoIdAbertoPelaUrl) return;
    this.assistidoIdAbertoPelaUrl = assistidoId;
    this.http.get<AssistidoResponseDTO>(`${this.apiAssistidos}/${assistidoId}`).subscribe({
      next: (assistido) => this.abrirModalVisualizarAssistido(assistido),
      error: (erro) => console.error('Erro ao abrir a ficha do assistido:', erro),
    });
  }

  /** Só Coordenação/Sociopedagógico listam oficinas — para os demais perfis o filtro some. */
  carregarOficinas(): void {
    this.http.get<OficinaResponseDTO[]>(this.apiOficinas).subscribe({
      next: (lista) => this.oficinas.set(lista),
      error: () => this.oficinas.set([]),
    });
  }

  /** Parâmetros de recorte comuns à listagem e à contagem das abas. */
  private paramsRecorte(): HttpParams {
    let params = new HttpParams();
    const busca = this.termoBusca().trim();
    if (busca) params = params.set('busca', busca);
    const turmaId = this.filtroTurma();
    if (turmaId !== '') params = params.set('turmaId', turmaId.toString());
    const oficinaId = this.filtroOficina();
    if (oficinaId !== '') params = params.set('oficinaId', oficinaId.toString());
    return params;
  }

  carregarContagem(): void {
    this.http
      .get<AssistidoContagemDTO>(`${this.apiAssistidos}/contagem`, { params: this.paramsRecorte() })
      .subscribe({
        next: (c) => this.contagem.set(c),
        error: () => this.contagem.set(null),
      });
  }

  /** Recarrega lista (da 1ª página) e totais das abas após mudar busca/turma/oficina. */
  private recarregarRecorte(): void {
    this.pagina.set(0);
    this.carregarAssistidos();
    this.carregarContagem();
  }

  carregarTurmas(): void {
    this.http.get<TurmaResponseDTO[]>(this.apiTurmas).subscribe({
      next: (lista) => {
        // Exibir turmas disponíveis para vinculação
        this.turmas.set(lista);
      },
      error: (erro) => console.error('Erro ao carregar turmas:', erro),
    });
  }

  onBuscaChange(valor: string): void {
    this.termoBusca.set(valor);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => this.recarregarRecorte(), 350);
  }

  onFiltroTurmaChange(valor: any): void {
    const num = valor === '' || valor === null ? '' : Number(valor);
    if (num === this.filtroTurma()) {
      this.recarregarRecorte();
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { turmaId: num || null },
      queryParamsHandling: 'merge',
    });
  }

  onFiltroOficinaChange(valor: any): void {
    const oficinaId = valor === '' || valor === null ? '' : Number(valor);
    this.filtroOficina.set(oficinaId);
    // turma escolhida que não pertence à nova oficina deixa de fazer sentido
    const turma = this.turmas().find((t) => t.turmaId === this.filtroTurma());
    if (oficinaId !== '' && turma && turma.oficinaId !== oficinaId) {
      this.onFiltroTurmaChange('');
      return;
    }
    this.recarregarRecorte();
  }

  /**
   * Turma do filtro ativo (vindo de "Ver alunos" em Turmas, ou escolhido no
   * próprio select) — usada pro banner de contexto no topo da lista, já que
   * sem isso o único indício do filtro era o texto dentro do select.
   */
  readonly turmaFiltroAtual = computed(() => {
    const id = this.filtroTurma();
    if (id === '') return null;
    return this.turmas().find((turma) => turma.turmaId === id) ?? null;
  });

  removerFiltroTurma(): void {
    this.onFiltroTurmaChange('');
  }

  voltarParaTurmas(): void {
    this.router.navigate(['/turmas']);
  }

  abrirCadastroEmMassa(): void {
    this.router.navigate(['/assistidos/lote']);
  }

  trocarAbaStatus(aba: 'todos' | 'ativos' | 'inativos' | 'acomp'): void {
    this.abaAtiva.set(aba);
    this.pagina.set(0);
    this.carregarAssistidos();
  }

  limparFiltros(): void {
    this.termoBusca.set('');
    this.filtroOficina.set('');
    this.abaAtiva.set('todos');
    this.onFiltroTurmaChange('');
  }

  paginaAnterior(): void {
    if (this.temAnterior()) {
      this.pagina.update((p) => p - 1);
      this.carregarAssistidos();
    }
  }

  proximaPagina(): void {
    if (this.temProxima()) {
      this.pagina.update((p) => p + 1);
      this.carregarAssistidos();
    }
  }

  abrirFormNovoResponsavelVinculado(): void {
    this.novoResponsavelVinculado = this.responsavelVazio();
    this.erroResponsavelVinculado.set(null);
    this.mostrarFormNovoResponsavelVinculado.set(true);
  }

  fecharFormNovoResponsavelVinculado(): void {
    this.mostrarFormNovoResponsavelVinculado.set(false);
  }

  atualizarCampoResponsavelVinculado(
    campo: keyof ResponsavelPendente,
    valor: string | boolean,
  ): void {
    this.novoResponsavelVinculado = { ...this.novoResponsavelVinculado, [campo]: valor };
  }

  /*
   * ============================================================
   * LISTAR COM FILTROS E PAGINAÇÃO (CA-A03.1 e CA-A03.2)
   * ============================================================
   */
  carregarAssistidos(): void {
    this.carregando.set(true);

    let params = this.paramsRecorte()
      .set('pagina', this.pagina().toString())
      .set('tamanho', this.tamanho.toString());

    const aba = this.abaAtiva();
    if (aba === 'ativos') {
      params = params.set('status', StatusGeral.ATIVO);
    } else if (aba === 'inativos') {
      params = params.set('status', StatusGeral.INATIVO);
    } else if (aba === 'acomp') {
      params = params.set('emAcompanhamento', 'true');
    }

    this.http.get<PaginaResponse<AssistidoResponseDTO>>(this.apiAssistidos, { params }).subscribe({
      next: (resp) => {
        this.assistidos.set(resp.conteudo);
        this.totalPaginas.set(resp.totalPaginas);
        this.totalElementos.set(resp.totalElementos);
        this.carregando.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar assistidos:', erro);
        this.carregando.set(false);
      },
    });
  }

  /* ============================================================
   * APRESENTAÇÃO DA LISTAGEM
   * ============================================================ */

  /** CPF parcialmente oculto na listagem (LGPD); completo só na ficha. */
  cpfMascarado(cpf: string | null): string {
    const d = (cpf ?? '').replace(/\D/g, '');
    return d.length === 11 ? `***.***.${d.slice(6, 9)}-**` : '—';
  }

  telefoneFormatado(telefone: string | null | undefined): string {
    return telefone ? formatarTelefone(telefone) : '';
  }

  telefoneLink(telefone: string | null | undefined): string {
    return 'tel:+55' + (telefone ?? '').replace(/\D/g, '');
  }

  /** Mesmas faixas de cor da barra de frequência do restante do sistema. */
  classeFrequencia(percentual: number | null | undefined): string {
    if (percentual == null) return '';
    if (percentual >= 75) return 'f-good';
    if (percentual >= 65) return 'f-mid';
    return 'f-low';
  }

  acoesAssistido(assistido: AssistidoResponseDTO): ActionMenuItem[] {
    const ativo = assistido.status === StatusGeral.ATIVO;
    return [
      { id: 'ver', label: 'Ver ficha', icon: 'eye' },
      { id: 'editar', label: 'Editar', icon: 'edit' },
      ativo
        ? { id: 'status', label: 'Inativar', icon: 'power', danger: true }
        : { id: 'status', label: 'Reativar', icon: 'rotate-ccw' },
    ];
  }

  executarAcao(acao: string, assistido: AssistidoResponseDTO): void {
    if (acao === 'ver') {
      this.abrirModalVisualizarAssistido(assistido);
    } else if (acao === 'editar') {
      this.abrirModalEditarAssistido(assistido);
    } else if (acao === 'turma') {
      this.abrirModalEditarAssistido(assistido, 'turma');
    } else if (acao === 'status') {
      this.alterarStatus(
        assistido,
        assistido.status === StatusGeral.ATIVO ? StatusGeral.INATIVO : StatusGeral.ATIVO,
      );
    }
  }

  abrirFichaPelaLinha(evento: MouseEvent, assistido: AssistidoResponseDTO): void {
    if (!cliqueEmElementoInterativo(evento)) {
      this.abrirModalVisualizarAssistido(assistido);
    }
  }

  executarAcaoDaFicha(acao: string): void {
    const assistido = this.assistidoSelecionado()!;
    this.fecharModalVisualizarAssistido();
    this.executarAcao(acao, assistido);
  }

  calcularIdade(dataNascimento: string): number {
    const nasc = new Date(dataNascimento);
    const hoje = new Date();

    let idade = hoje.getFullYear() - nasc.getFullYear();
    const aindaNaoFezAniversario =
      hoje.getMonth() < nasc.getMonth() ||
      (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());

    if (aindaNaoFezAniversario) {
      idade--;
    }

    return idade;
  }

  /*
   * ============================================================
   * MODAL: NOVO ASSISTIDO
   * ============================================================
   */
  private assistidoVazio(): AssistidoRequestDTO {
    return {
      nomeCompleto: '',
      dataNascimento: '',
      cpf: '',
      dataEntrada: '',
      necessidadesEspecificas: '',
      observacoes: '',
      turmaId: null,
      sexo: null,
      possuiProblemaSaude: null,
      problemaSaude: '',
      pcd: null,
      deficiencia: '',
      escolaNome: '',
      escolaAnoSerie: '',
      escolaTurno: null,
      estudaContraturno: null,
      endereco: enderecoParaForm(null),
      rendaFamiliar: null,
      recebeProgramaTransferencia: null,
      programasTransferencia: [],
      programaTransferenciaOutro: '',
      nis: '',
      aceiteLgpd: false,
      autorizaUsoImagem: false,
      autorizaEventosPasseios: false,
      podeIrEmboraSozinho: false,
      cienteFrequenciaObrigatoria: false,
      responsaveis: [],
    };
  }

  private responsavelVazio(): ResponsavelPendente {
    return {
      nomeCompleto: '',
      dataNascimento: '',
      cpf: '',
      telefone: '',
      email: '',
      endereco: enderecoParaForm(null),
      observacoes: '',
      escolaridade: null,
      estadoCivil: null,
      profissao: '',
      renda: null,
      parentesco: '',
      responsavelPrincipal: false, // default fixo, sem depender de signal
      contatoEmergencia: false,
      autorizadoRetirada: false,
    };
  }

  /** Limite de renda familiar do programa (tabela parametro_sistema); null = regra ainda não definida. */
  limiteRendaFamiliar = signal<number | null>(null);

  private carregarElegibilidade(): void {
    this.http.get<ElegibilidadeDTO>(`${this.apiAssistidos}/elegibilidade`).subscribe({
      next: (criterios) => this.limiteRendaFamiliar.set(criterios.rendaFamiliarLimite),
      error: () => this.limiteRendaFamiliar.set(null),
    });
  }

  abrirModalNovoAssistido(): void {
    this.carregarElegibilidade();
    this.novoAssistido = this.assistidoVazio();
    this.responsaveisVinculados.set([]);
    this.novoResponsavel = this.responsavelVazio();
    this.mostrarFormResponsavelNovo.set(true);
    this.indiceResponsavelEmEdicaoNovo.set(null);
    this.erroSalvar.set(null);
    this.erroResponsavel.set(null);
    this.alertaDuplicidade.set(false);
    this.fotoPerfilNovoAssistido.set(null);
    this.documentosIdentidadeNovo.set([]);
    this.tentouSalvarNovo.set(false);
    this.mostrarModalNovo.set(true);
  }

  fecharModalNovoAssistido(): void {
    this.mostrarModalNovo.set(false);
  }

  /*
   * ============================================================
   * MODAL: EDITAR ASSISTIDO (Ação por linha)
   * ============================================================
   */
  abrirModalEditarAssistido(assistido: AssistidoResponseDTO, secao: 'dados' | 'turma' = 'dados'): void {
    this.secaoEdicao.set(secao);
    this.assistidoEmEdicao.set(assistido);
    this.formEdicaoAssistido = this.formDoAssistido(assistido);
    this.erroSalvarEdicao.set(null);
    this.fotoPerfilEdicao.set(null);
    this.documentosIdentidadeEdicao.set([]);
    this.mostrarModalEditar.set(true);
  }

  /** Request completo (PUT substitui o cadastro inteiro) a partir do que a API devolveu. */
  private formDoAssistido(assistido: AssistidoResponseDTO): AssistidoRequestDTO {
    return {
      nomeCompleto: assistido.nomeCompleto,
      dataNascimento: assistido.dataNascimento,
      cpf: assistido.cpf ?? '',
      dataEntrada: assistido.dataEntrada ?? '',
      necessidadesEspecificas: assistido.necessidadesEspecificas ?? '',
      observacoes: assistido.observacoes ?? '',
      turmaId: assistido.turmaId ?? null,
      sexo: assistido.sexo ?? null,
      possuiProblemaSaude: assistido.possuiProblemaSaude ?? null,
      problemaSaude: assistido.problemaSaude ?? '',
      pcd: assistido.pcd ?? null,
      deficiencia: assistido.deficiencia ?? '',
      escolaNome: assistido.escolaNome ?? '',
      escolaAnoSerie: assistido.escolaAnoSerie ?? '',
      escolaTurno: assistido.escolaTurno ?? null,
      estudaContraturno: assistido.estudaContraturno ?? null,
      endereco: enderecoParaForm(assistido.endereco),
      rendaFamiliar: assistido.rendaFamiliar ?? null,
      recebeProgramaTransferencia: assistido.recebeProgramaTransferencia ?? null,
      programasTransferencia: [...(assistido.programasTransferencia ?? [])],
      programaTransferenciaOutro: assistido.programaTransferenciaOutro ?? '',
      nis: assistido.nis ?? '',
      aceiteLgpd: assistido.aceiteLgpd ?? false,
      autorizaUsoImagem: assistido.autorizaUsoImagem ?? false,
      autorizaEventosPasseios: assistido.autorizaEventosPasseios ?? false,
      podeIrEmboraSozinho: assistido.podeIrEmboraSozinho ?? false,
      cienteFrequenciaObrigatoria: assistido.cienteFrequenciaObrigatoria ?? false,
      // Sem `responsaveis`: a API reconcilia os vínculos se a lista vier, mesmo vazia.
      // Responsáveis se editam na aba "Família".
    };
  }

  fecharModalEditar(): void {
    this.mostrarModalEditar.set(false);
    this.assistidoEmEdicao.set(null);
    this.erroSalvarEdicao.set(null);
    this.fotoPerfilEdicao.set(null);
    this.documentosIdentidadeEdicao.set([]);
  }

  atualizarCampoEdicaoAssistido(campo: keyof AssistidoRequestDTO, valor: any): void {
    const processado = campo === 'turmaId' ? (valor === '' || valor === null ? null : Number(valor)) : valor;
    this.formEdicaoAssistido = { ...this.formEdicaoAssistido, [campo]: processado };
  }

  async salvarEdicaoAssistido(): Promise<void> {
    const assistido = this.assistidoEmEdicao();
    if (!assistido || this.salvandoEdicao()) {
      return;
    }

    if (!this.formEdicaoAssistido.nomeCompleto.trim() || !this.formEdicaoAssistido.dataNascimento) {
      this.erroSalvarEdicao.set('Preencha nome completo e data de nascimento.');
      return;
    }

    if (this.formEdicaoAssistido.cpf && !cpfValido(this.formEdicaoAssistido.cpf)) {
      this.erroSalvarEdicao.set('CPF do assistido inválido.');
      return;
    }

    const erroComplementares = this.validarDadosComplementares(this.formEdicaoAssistido);
    if (erroComplementares) {
      this.erroSalvarEdicao.set(erroComplementares);
      return;
    }

    this.salvandoEdicao.set(true);
    this.erroSalvarEdicao.set(null);

    try {
      const payload: AssistidoRequestDTO = {
        ...this.paraPayloadAssistido(this.formEdicaoAssistido),
        turmaId: this.formEdicaoAssistido.turmaId ? Number(this.formEdicaoAssistido.turmaId) : null,
      };

      await firstValueFrom(
        this.http.put<AssistidoResponseDTO>(
          `${this.apiAssistidos}/${assistido.assistidoId}`,
          payload,
        ),
      );

      const novaFoto = this.fotoPerfilEdicao();
      if (novaFoto) {
        try {
          // O back substitui a foto anterior (FOTO_PERFIL é única por assistido).
          await this.arquivoService.enviar(
            EntidadeArquivo.ASSISTIDO,
            assistido.assistidoId,
            CategoriaArquivo.FOTO_PERFIL,
            novaFoto,
          );
          this.arquivoService.invalidarFotoPerfil(EntidadeArquivo.ASSISTIDO, assistido.assistidoId);
        } catch (erroFoto) {
          // Dados já foram salvos; só a foto falhou — mantém o modal aberto para tentar de novo.
          console.error('Erro ao enviar foto de perfil:', erroFoto);
          this.erroSalvarEdicao.set(
            'Dados salvos, mas a foto não pôde ser enviada: ' +
              mensagemErro(erroFoto as HttpErrorResponse, 'tente novamente.'),
          );
          this.salvandoEdicao.set(false);
          this.carregarAssistidos();
          return;
        }
      }

      const novosDocumentos = this.documentosIdentidadeEdicao();
      if (novosDocumentos.length > 0) {
        try {
          await this.substituirDocumentosIdentidade(assistido.assistidoId, novosDocumentos);
        } catch (erroDoc) {
          console.error('Erro ao trocar RG/CPF:', erroDoc);
          this.erroSalvarEdicao.set(
            'Dados salvos, mas o RG/CPF não pôde ser trocado: ' +
              mensagemErro(erroDoc as HttpErrorResponse, 'tente novamente.'),
          );
          this.salvandoEdicao.set(false);
          this.carregarAssistidos();
          return;
        }
      }

      this.salvandoEdicao.set(false);
      this.fecharModalEditar();
      this.carregarAssistidos();
      this.carregarContagem();
    } catch (erro: any) {
      console.error('Erro ao atualizar assistido:', erro);
      this.erroSalvarEdicao.set(
        mensagemErro(erro, 'Não foi possível salvar as alterações.'),
      );
      this.salvandoEdicao.set(false);
    }
  }

  /**
   * Troca o RG/CPF: envia os novos e só depois remove os antigos — se o envio
   * falhar no meio, o assistido nunca fica sem documento.
   */
  private async substituirDocumentosIdentidade(assistidoId: number, novos: File[]): Promise<void> {
    const antigos = await this.arquivoService.listar(
      EntidadeArquivo.ASSISTIDO,
      assistidoId,
      CategoriaArquivo.DOCUMENTO_IDENTIDADE,
    );
    const enviados: number[] = [];
    for (const documento of novos) {
      const salvo = await this.arquivoService.enviar(
        EntidadeArquivo.ASSISTIDO,
        assistidoId,
        CategoriaArquivo.DOCUMENTO_IDENTIDADE,
        documento,
      );
      enviados.push(salvo.arquivoId);
    }
    // Arquivo idêntico a um antigo volta com o mesmo id (o back deduplica): esse não é removido.
    for (const antigo of antigos.filter((a) => !enviados.includes(a.arquivoId))) {
      await this.arquivoService.remover(antigo.arquivoId);
    }
  }

  atualizarCampoResponsavel(campo: keyof ResponsavelPendente, valor: string | boolean): void {
    this.novoResponsavel = { ...this.novoResponsavel, [campo]: valor };
  }

  atualizarCampoAssistido(campo: keyof AssistidoRequestDTO, valor: string | boolean): void {
    this.novoAssistido = { ...this.novoAssistido, [campo]: valor };

    if (campo === 'nomeCompleto' || campo === 'dataNascimento') {
      this.dispararChecagemDuplicidade();
    }
  }

  private dispararChecagemDuplicidade(): void {
    clearTimeout(this.debounceTimerDuplicidade);

    const nome = this.novoAssistido.nomeCompleto?.trim() ?? '';
    const dataNascimento = this.novoAssistido.dataNascimento;

    if (!nome || !dataNascimento) {
      this.alertaDuplicidade.set(false);
      return;
    }

    this.debounceTimerDuplicidade = setTimeout(async () => {
      try {
        const resultado = await firstValueFrom(
          this.http.get<{ possivelDuplicidade: boolean }>(`${this.apiAssistidos}/verificar-duplicidade`, {
            params: new HttpParams().set('nomeCompleto', nome).set('dataNascimento', dataNascimento),
          }),
        );

        this.alertaDuplicidade.set(Boolean(resultado?.possivelDuplicidade));
      } catch {
        this.alertaDuplicidade.set(false);
      }
    }, 400);
  }

  private validarAssistidoAntesSalvar(): string | null {
    if (this.documentosIdentidadeNovo().length === 0) {
      return MENSAGEM_SEM_DOCUMENTO;
    }

    if (!this.novoAssistido.nomeCompleto.trim() || !this.novoAssistido.dataNascimento) {
      return 'Preencha nome completo e data de nascimento.';
    }

    if (this.novoAssistido.cpf && !cpfValido(this.novoAssistido.cpf)) {
      return 'CPF do assistido inválido.';
    }

    const erroComplementares = this.validarDadosComplementares(this.novoAssistido);
    if (erroComplementares) {
      return erroComplementares;
    }

    // Regra de corte só na entrada (o back faz a mesma checagem).
    const limite = this.limiteRendaFamiliar();
    const renda = this.novoAssistido.rendaFamiliar;
    if (limite != null && renda != null && renda > limite) {
      return `Renda familiar acima do limite do programa (${formatarMoeda(limite)}). A família não pode ser cadastrada.`;
    }

    const turmaSelecionada = this.turmas().find((turma) => turma.turmaId === Number(this.novoAssistido.turmaId));
    if (this.novoAssistido.turmaId && !turmaSelecionada?.ativo) {
      return 'A turma selecionada deve estar ativa.';
    }

    if (this.responsaveisVinculados().length === 0 && this.responsaveisPendentes().length === 0) {
      return 'Informe pelo menos um responsável para o assistido.';
    }

    return null;
  }

  /** "Qual?" é obrigatório quando problema de saúde / PcD está marcado como Sim (mesma regra do back). */
  private validarDadosComplementares(dados: AssistidoRequestDTO): string | null {
    if (dados.possuiProblemaSaude && !dados.problemaSaude?.trim()) {
      return 'Informe qual é o problema de saúde do assistido.';
    }
    if (dados.pcd && !dados.deficiencia?.trim()) {
      return 'Informe qual é a deficiência do assistido.';
    }
    if (dados.recebeProgramaTransferencia) {
      const programas = dados.programasTransferencia ?? [];
      if (programas.length === 0) {
        return 'Marque qual programa de transferência de renda a família recebe.';
      }
      if (programas.includes(ProgramaTransferencia.OUTRO) && !dados.programaTransferenciaOutro?.trim()) {
        return 'Informe o nome do outro programa de transferência de renda.';
      }
    }
    if (dados.nis && dados.nis.length !== 11) {
      return 'NIS / CadÚnico deve ter 11 dígitos.';
    }
    return null;
  }

  /** Normaliza o form antes de enviar: endereço vazio vira null e descrições só vão com o indicador marcado. */
  private paraPayloadAssistido(dados: AssistidoRequestDTO): AssistidoRequestDTO {
    return {
      ...dados,
      problemaSaude: dados.possuiProblemaSaude ? dados.problemaSaude?.trim() || null : null,
      deficiencia: dados.pcd ? dados.deficiencia?.trim() || null : null,
      escolaNome: dados.escolaNome?.trim() || null,
      escolaAnoSerie: dados.escolaAnoSerie?.trim() || null,
      endereco: enderecoParaPayload(dados.endereco),
      programasTransferencia: dados.recebeProgramaTransferencia ? (dados.programasTransferencia ?? []) : [],
      programaTransferenciaOutro:
        dados.recebeProgramaTransferencia && dados.programasTransferencia?.includes(ProgramaTransferencia.OUTRO)
          ? dados.programaTransferenciaOutro?.trim() || null
          : null,
      nis: dados.nis?.replace(/\D/g, '') || null,
    };
  }

  /** Soma da renda dos responsáveis já informados no cadastro — referência para a renda familiar. */
  somaRendaResponsaveisNovo(): number | null {
    const rendas = [...this.responsaveisVinculados(), ...this.responsaveisPendentes()]
      .map((r) => r.renda)
      .filter((renda): renda is number => renda != null);
    return rendas.length ? rendas.reduce((total, renda) => total + renda, 0) : null;
  }

  rotuloProgramas(assistido: AssistidoResponseDTO): string {
    if (assistido.recebeProgramaTransferencia == null) return 'Não informado';
    if (!assistido.recebeProgramaTransferencia) return 'Não';
    return (assistido.programasTransferencia ?? [])
      .map((p) =>
        p === ProgramaTransferencia.OUTRO && assistido.programaTransferenciaOutro
          ? assistido.programaTransferenciaOutro
          : PROGRAMA_TRANSFERENCIA_LABELS[p],
      )
      .join(', ');
  }

  /** Responsável preenchido no front -> payload "cadastrar e vincular". */
  private paraVinculoComResponsavel(
    responsavel: ResponsavelPendente,
    responsavelPrincipal = responsavel.responsavelPrincipal,
  ): VinculoFamiliarComResponsavelRequestDTO {
    return {
      nomeCompleto: responsavel.nomeCompleto,
      dataNascimento: responsavel.dataNascimento || undefined,
      cpf: responsavel.cpf || undefined,
      telefone: responsavel.telefone || undefined,
      email: responsavel.email || undefined,
      endereco: enderecoParaPayload(responsavel.endereco),
      observacoes: responsavel.observacoes || undefined,
      escolaridade: responsavel.escolaridade ?? null,
      estadoCivil: responsavel.estadoCivil ?? null,
      profissao: responsavel.profissao?.trim() || null,
      renda: responsavel.renda ?? null,
      parentesco: responsavel.parentesco || undefined,
      responsavelPrincipal,
      contatoEmergencia: responsavel.contatoEmergencia,
      autorizadoRetirada: responsavel.autorizadoRetirada,
    };
  }

  /** Endereço do responsável principal já informado no cadastro — atalho "Mesmo do responsável". */
  enderecoResponsavelPrincipalNovo(): EnderecoDTO | null {
    const todos = [...this.responsaveisVinculados(), ...this.responsaveisPendentes()];
    const principal = todos.find((r) => r.responsavelPrincipal) ?? todos[0];
    return principal?.endereco ?? null;
  }

  /* Rótulos usados na ficha (visualização). */
  rotuloSexo(sexo: Sexo | null | undefined): string {
    return sexo ? SEXO_LABELS[sexo] : 'Não informado';
  }

  rotuloEscolaridade(escolaridade: Escolaridade | null | undefined): string {
    return escolaridade ? ESCOLARIDADE_LABELS[escolaridade] : 'Não informado';
  }

  rotuloEstadoCivil(estadoCivil: EstadoCivil | null | undefined): string {
    return estadoCivil ? ESTADO_CIVIL_LABELS[estadoCivil] : 'Não informado';
  }

  rotuloSimNao(valor: boolean | null | undefined): string {
    return valor == null ? 'Não informado' : valor ? 'Sim' : 'Não';
  }

  /*
   * ============================================================
   * ADICIONAR / REMOVER RESPONSÁVEL PENDENTE
   * (só vira request de verdade quando o assistido for salvo)
   * ============================================================
   */
  adicionarResponsavelPendente(): void {
    const erroValidacao = this.validarResponsavel(this.novoResponsavel);
    if (erroValidacao) {
      this.erroResponsavel.set(erroValidacao);
      return;
    }
    this.erroResponsavel.set(null);

    const ehPrimeiro = this.responsaveisPendentes().length === 0;

    const responsavel: ResponsavelPendente = {
      ...this.novoResponsavel,
      responsavelPrincipal: ehPrimeiro ? true : this.novoResponsavel.responsavelPrincipal,
    };

    this.responsaveisPendentes.update((lista) => [...lista, responsavel]);

    this.novoResponsavel = this.responsavelVazio();
  }

  private validarResponsavel(responsavel: { nomeCompleto: string; cpf?: string; telefone?: string }): string | null {
    if (!responsavel.nomeCompleto.trim()) {
      return 'Informe o nome do responsável.';
    }
    if (!cpfValido(responsavel.cpf ?? '')) {
      return 'Informe um CPF válido para o responsável.';
    }
    if (!telefoneValido(responsavel.telefone ?? '')) {
      return 'Telefone do responsável deve ter DDD + número (10 ou 11 dígitos).';
    }
    return null;
  }

  removerResponsavelPendente(index: number): void {
    this.responsaveisPendentes.update((lista) => lista.filter((_, i) => i !== index));
  }

  /*
   * ============================================================
   * SALVAR
   * ============================================================
   * POST /api/assistidos (multipart) com responsáveis, foto e documentos.
   */
  async salvarAssistido(): Promise<void> {
    if (this.salvando()) {
      return;
    }

    this.tentouSalvarNovo.set(true);

    // Responsável preenchido sem clicar em "Salvar responsável" entra automaticamente.
    if (this.novoResponsavel.nomeCompleto.trim()) {
      const erroResponsavel = this.validarResponsavel(this.novoResponsavel);
      if (erroResponsavel) {
        this.erroSalvar.set(erroResponsavel);
        return;
      }
      await this.salvarResponsavel();
    }

    const erroValidacao = this.validarAssistidoAntesSalvar();
    if (erroValidacao) {
      this.erroSalvar.set(erroValidacao);
      return;
    }

    this.salvando.set(true);
    this.erroSalvar.set(null);

    const responsaveisPayload: VinculoFamiliarComResponsavelRequestDTO[] = [
      ...this.responsaveisVinculados(),
      ...this.responsaveisPendentes(),
    ].map((responsavel) => this.paraVinculoComResponsavel(responsavel));

    const payload: AssistidoRequestDTO = {
      ...this.paraPayloadAssistido(this.novoAssistido),
      turmaId: this.novoAssistido.turmaId ? Number(this.novoAssistido.turmaId) : null,
      responsaveis: responsaveisPayload,
    };

    try {
      await firstValueFrom(
        this.assistidoService.cadastrar(payload, this.fotoPerfilNovoAssistido(), this.documentosIdentidadeNovo()),
      );

      this.salvando.set(false);
      this.fecharModalNovoAssistido();
      this.carregarAssistidos();
      this.carregarContagem();
    } catch (erro: any) {
      console.error('Erro ao salvar assistido:', erro);

      this.erroSalvar.set(
        mensagemErro(erro, 'Não foi possível salvar. Verifique os dados e tente novamente.'),
      );
      this.salvando.set(false);
    }
  }

  /*
   * ============================================================
   * ALTERAR STATUS (encerramento/reativação)
   * ============================================================
   */
  alterarStatus(assistido: AssistidoResponseDTO, novoStatus: StatusGeral): void {
    this.assistidoSelecionadoStatus.set(assistido);
    this.novoStatusDesejado.set(novoStatus);
    this.mostrarModalStatus.set(true);
  }

  confirmarAlteracaoStatus(): void {
    const assistido = this.assistidoSelecionadoStatus();
    if (assistido) {
      this.executarAlteracaoStatus(assistido, this.novoStatusDesejado());
    }
    this.mostrarModalStatus.set(false);
    this.assistidoSelecionadoStatus.set(null);
  }

  private executarAlteracaoStatus(assistido: AssistidoResponseDTO, status: StatusGeral): void {
    const dto: AssistidoStatusRequestDTO = { status };

    this.http
      .patch<AssistidoResponseDTO>(`${this.apiAssistidos}/${assistido.assistidoId}/status`, dto)
      .subscribe({
        next: () => {
          this.carregarAssistidos();
          this.carregarContagem();
        },
        error: (erro) => console.error('Erro ao alterar status:', erro),
      });
  }

  // ============================================================
  // MODAL: VISUALIZAR ASSISTIDO
  // ============================================================

  mostrarModalVisualizar = signal(false);

  assistidoSelecionado = signal<AssistidoResponseDTO | null>(null);

  responsaveisDoAssistido = signal<VinculoFamiliarResponseDTO[]>([]);

  carregandoResponsaveis = signal(false);

  erroResponsaveis = signal<string | null>(null);

  abrirModalVisualizarAssistido(assistido: AssistidoResponseDTO): void {
    this.abaVerAssistido.set('dados'); // reset
    this.editandoSocioeconomico.set(false);

    this.assistidoSelecionado.set(assistido);

    this.responsaveisDoAssistido.set([]);

    this.erroResponsaveis.set(null);

    this.mostrarFormNovoResponsavelVinculado.set(false);

    this.historicoTurmasAssistido.set([]);

    this.erroHistoricoTurmas.set(null);

    this.historicoTurmasCarregado = false;

    this.frequenciaAssistido.set([]);

    this.erroFrequencia.set(null);

    this.frequenciaCarregada = false;

    this.mostrarModalVisualizar.set(true);

    this.carregarResponsaveis(assistido.assistidoId);
  }

  /* ---- Aba "Família": renda e programas (editável ali mesmo) ---- */
  editandoSocioeconomico = signal(false);
  salvandoSocioeconomico = signal(false);
  erroSocioeconomico = signal<string | null>(null);
  formSocioeconomico: AssistidoRequestDTO = this.assistidoVazio();

  abrirEdicaoSocioeconomico(): void {
    const assistido = this.assistidoSelecionado();
    if (!assistido) return;
    this.formSocioeconomico = this.formDoAssistido(assistido);
    this.erroSocioeconomico.set(null);
    this.editandoSocioeconomico.set(true);
  }

  cancelarEdicaoSocioeconomico(): void {
    this.editandoSocioeconomico.set(false);
    this.erroSocioeconomico.set(null);
  }

  async salvarSocioeconomico(): Promise<void> {
    const assistido = this.assistidoSelecionado();
    if (!assistido || this.salvandoSocioeconomico()) return;

    const erro = this.validarDadosComplementares(this.formSocioeconomico);
    if (erro) {
      this.erroSocioeconomico.set(erro);
      return;
    }

    this.salvandoSocioeconomico.set(true);
    this.erroSocioeconomico.set(null);
    try {
      const atualizado = await firstValueFrom(
        this.http.put<AssistidoResponseDTO>(
          `${this.apiAssistidos}/${assistido.assistidoId}`,
          this.paraPayloadAssistido(this.formSocioeconomico),
        ),
      );
      this.assistidoSelecionado.set({ ...assistido, ...atualizado });
      this.editandoSocioeconomico.set(false);
      this.carregarAssistidos();
    } catch (erroHttp) {
      this.erroSocioeconomico.set(mensagemErro(erroHttp as HttpErrorResponse, 'Não foi possível salvar.'));
    } finally {
      this.salvandoSocioeconomico.set(false);
    }
  }

  /** Aba "Permissões": termos assinados no cadastro. */
  readonly termosFicha: { campo: 'aceiteLgpd' | 'autorizaUsoImagem' | 'autorizaEventosPasseios' | 'podeIrEmboraSozinho' | 'cienteFrequenciaObrigatoria'; titulo: string; descricao: string }[] = [
    { campo: 'aceiteLgpd', titulo: 'Uso de dados (LGPD)', descricao: 'Coleta e guarda dos dados do assistido e da família para o atendimento.' },
    { campo: 'autorizaUsoImagem', titulo: 'Cessão de imagem', descricao: 'Fotos e vídeos em materiais e redes sociais da ADRA.' },
    { campo: 'autorizaEventosPasseios', titulo: 'Eventos, passeios e viagens', descricao: 'Participar de atividades fora da ADRA, com a equipe.' },
    { campo: 'podeIrEmboraSozinho', titulo: 'Pode ir embora sozinho', descricao: 'Sair sozinho ao fim das atividades, sem um responsável.' },
    { campo: 'cienteFrequenciaObrigatoria', titulo: 'Ciente da frequência obrigatória', descricao: 'A família sabe que a frequência é acompanhada pela equipe.' },
  ];

  fecharModalVisualizarAssistido(): void {
    this.editandoSocioeconomico.set(false);
    this.mostrarModalVisualizar.set(false);

    this.assistidoSelecionado.set(null);

    this.responsaveisDoAssistido.set([]);

    this.erroResponsaveis.set(null);

    this.historicoTurmasAssistido.set([]);

    this.erroHistoricoTurmas.set(null);

    this.historicoTurmasCarregado = false;

    this.frequenciaAssistido.set([]);

    this.erroFrequencia.set(null);

    this.frequenciaCarregada = false;
  }

  // ============================================================
  // ABA "TURMAS" (histórico de vínculos, turma_aluno) — só coordenador
  // ============================================================

  historicoTurmasAssistido = signal<VinculoTurmaAssistidoResponseDTO[]>([]);

  carregandoHistoricoTurmas = signal(false);

  erroHistoricoTurmas = signal<string | null>(null);

  /** Evita recarregar toda vez que a pessoa clica de novo na aba. */
  private historicoTurmasCarregado = false;

  carregarHistoricoTurmas(assistidoId: number): void {
    if (this.historicoTurmasCarregado) return;

    this.carregandoHistoricoTurmas.set(true);
    this.erroHistoricoTurmas.set(null);

    this.http
      .get<VinculoTurmaAssistidoResponseDTO[]>(`${this.apiAssistidos}/${assistidoId}/turmas`)
      .subscribe({
        next: (historico) => {
          this.historicoTurmasAssistido.set(historico);
          this.historicoTurmasCarregado = true;
          this.carregandoHistoricoTurmas.set(false);
        },
        error: (erro) => {
          console.error('Erro ao carregar histórico de turmas:', erro);
          this.erroHistoricoTurmas.set('Não foi possível carregar o histórico de turmas deste assistido.');
          this.carregandoHistoricoTurmas.set(false);
        },
      });
  }

  // ============================================================
  // ABA "CHAMADAS" (frequência) — todos os perfis que abrem a ficha
  // ============================================================

  readonly StatusPresenca = StatusPresenca;

  frequenciaAssistido = signal<FrequenciaAulaDTO[]>([]);

  carregandoFrequencia = signal(false);

  erroFrequencia = signal<string | null>(null);

  /** Evita recarregar toda vez que a pessoa clica de novo na aba. */
  private frequenciaCarregada = false;

  /** Resumo no topo da aba: total de aulas no histórico, % de presença e faltas seguidas mais recentes (sem contar justificadas). */
  readonly resumoFrequencia = computed(() => {
    const lista = this.frequenciaAssistido();
    const total = lista.length;
    const presentes = lista.filter((f) => f.statusPresenca === StatusPresenca.PRESENTE).length;
    const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;

    let faltasConsecutivas = 0;
    for (const item of lista) {
      // já vem ordenado da aula mais recente pra mais antiga
      if (item.statusPresenca !== StatusPresenca.FALTA) break;
      faltasConsecutivas++;
    }

    return { total, percentual, faltasConsecutivas };
  });

  /** Lista agrupada por mês (mais recente primeiro), pra não virar uma lista infinita de datas soltas. */
  readonly frequenciaAgrupada = computed(() => {
    const grupos = new Map<string, FrequenciaAulaDTO[]>();
    for (const item of this.frequenciaAssistido()) {
      const chave = item.dataAula.slice(0, 7); // YYYY-MM
      const grupo = grupos.get(chave);
      if (grupo) {
        grupo.push(item);
      } else {
        grupos.set(chave, [item]);
      }
    }
    return Array.from(grupos.entries()).map(([chave, itens]) => ({
      rotulo: this.rotuloMesAno(chave),
      itens,
    }));
  });

  private rotuloMesAno(chaveAnoMes: string): string {
    const [ano, mes] = chaveAnoMes.split('-').map(Number);
    const rotulo = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
  }

  carregarFrequencia(assistidoId: number): void {
    if (this.frequenciaCarregada) return;

    this.carregandoFrequencia.set(true);
    this.erroFrequencia.set(null);

    this.chamadaService
      .carregarFrequencia(assistidoId)
      .then((frequencia) => {
        this.frequenciaAssistido.set(frequencia);
        this.frequenciaCarregada = true;
      })
      .catch((erro) => {
        console.error('Erro ao carregar frequência:', erro);
        this.erroFrequencia.set('Não foi possível carregar o histórico de frequência deste assistido.');
      })
      .finally(() => this.carregandoFrequencia.set(false));
  }

  /**
   * "Ver alunos" de uma turma do histórico — em vez de abrir mais uma modal
   * só com nomes, aplica o filtro por turma na própria listagem (já estamos
   * na tela de Assistidos) e fecha a ficha do assistido atual, deixando a
   * navegação óbvia: a lista por trás já aparece filtrada.
   */
  verAlunosDaTurmaHistorico(vinculo: VinculoTurmaAssistidoResponseDTO): void {
    this.fecharModalVisualizarAssistido();
    this.abaAtiva.set('todos');
    this.onFiltroTurmaChange(vinculo.turmaId);
  }

  /** "Ver aulas" de uma turma do histórico — reaproveita <app-aulas-turma-modal>, com abertura de aula liberada (só coordenador chega aqui). */
  turmaHistoricoAulasSelecionada = signal<VinculoTurmaAssistidoResponseDTO | null>(null);

  abrirAulasHistoricoTurma(vinculo: VinculoTurmaAssistidoResponseDTO): void {
    this.turmaHistoricoAulasSelecionada.set(vinculo);
  }

  fecharAulasHistoricoTurma(): void {
    this.turmaHistoricoAulasSelecionada.set(null);
  }

  carregarResponsaveis(assistidoId: number): void {
    this.carregandoResponsaveis.set(true);

    this.http.get<VinculoFamiliarResponseDTO[]>(`${this.apiAssistidos}/${assistidoId}/responsaveis`).subscribe({
      next: (responsaveis) => {
        this.responsaveisDoAssistido.set(responsaveis);

        this.carregandoResponsaveis.set(false);
      },

      error: (erro) => {
        console.error('Erro ao carregar responsáveis:', erro);

        this.erroResponsaveis.set('Não foi possível carregar os responsáveis deste assistido.');

        this.carregandoResponsaveis.set(false);
      },
    });
  }

  calcularIdadeResponsavel(dataNascimento?: string | null): string {
    if (!dataNascimento) {
      return 'Não informado';
    }

    return `${this.calcularIdade(dataNascimento)} anos`;
  }

  /**
   * "Salvar responsável" do cadastro: só guarda na lista local (vai para o banco
   * junto com o assistido, em "Salvar assistido"). Também conclui a edição de um
   * responsável já listado.
   */
  async salvarResponsavel(): Promise<void> {
    if (this.salvandoResponsavel()) {
      return;
    }

    const erroValidacao = this.validarResponsavel(this.novoResponsavel);
    if (erroValidacao) {
      this.erroResponsavel.set(erroValidacao);
      return;
    }

    this.salvandoResponsavel.set(true);
    this.erroResponsavel.set(null);
    this.erroSalvar.set(null);

    const indice = this.indiceResponsavelEmEdicaoNovo();
    const outros = this.responsaveisVinculados().filter((_, i) => i !== indice);
    const responsavelPrincipal = this.novoResponsavel.responsavelPrincipal || !outros.some((r) => r.responsavelPrincipal);
    const responsavel: ResponsavelPendente = { ...this.novoResponsavel, responsavelPrincipal };

    this.responsaveisVinculados.update((lista) => {
      // só um principal: marcar este desmarca os demais
      const ajustada = this.novoResponsavel.responsavelPrincipal
        ? lista.map((r) => ({ ...r, responsavelPrincipal: false }))
        : lista;
      return indice === null
        ? [...ajustada, responsavel]
        : ajustada.map((r, i) => (i === indice ? responsavel : r));
    });

    this.novoResponsavel = this.responsavelVazio();
    this.indiceResponsavelEmEdicaoNovo.set(null);
    this.mostrarFormResponsavelNovo.set(false);
    this.salvandoResponsavel.set(false);
  }

  abrirFormResponsavelNovo(): void {
    this.novoResponsavel = this.responsavelVazio();
    this.indiceResponsavelEmEdicaoNovo.set(null);
    this.erroResponsavel.set(null);
    this.mostrarFormResponsavelNovo.set(true);
  }

  editarResponsavelNovo(indice: number): void {
    const responsavel = this.responsaveisVinculados()[indice];
    if (!responsavel) return;
    this.novoResponsavel = { ...responsavel, endereco: enderecoParaForm(responsavel.endereco) };
    this.indiceResponsavelEmEdicaoNovo.set(indice);
    this.erroResponsavel.set(null);
    this.mostrarFormResponsavelNovo.set(true);
  }

  removerResponsavelNovo(indice: number): void {
    const removido = this.responsaveisVinculados()[indice];
    let lista = this.responsaveisVinculados().filter((_, i) => i !== indice);
    // sempre sobra um principal
    if (removido?.responsavelPrincipal && lista.length > 0 && !lista.some((r) => r.responsavelPrincipal)) {
      lista = lista.map((r, i) => (i === 0 ? { ...r, responsavelPrincipal: true } : r));
    }
    this.responsaveisVinculados.set(lista);

    const emEdicao = this.indiceResponsavelEmEdicaoNovo();
    if (emEdicao === indice) {
      this.abrirFormResponsavelNovo();
    } else if (emEdicao !== null && emEdicao > indice) {
      this.indiceResponsavelEmEdicaoNovo.set(emEdicao - 1);
    }
    if (lista.length === 0) {
      this.mostrarFormResponsavelNovo.set(true);
    }
  }

  cancelarFormResponsavelNovo(): void {
    this.novoResponsavel = this.responsavelVazio();
    this.indiceResponsavelEmEdicaoNovo.set(null);
    this.erroResponsavel.set(null);
    this.mostrarFormResponsavelNovo.set(false);
  }

  async salvarResponsavelVinculado(): Promise<void> {
    const assistido = this.assistidoSelecionado();
    if (!assistido || this.salvandoResponsavelVinculado()) {
      return;
    }

    const erroValidacao = this.validarResponsavel(this.novoResponsavelVinculado);
    if (erroValidacao) {
      this.erroResponsavelVinculado.set(erroValidacao);
      return;
    }

    this.salvandoResponsavelVinculado.set(true);
    this.erroResponsavelVinculado.set(null);

    const responsavelPrincipal =
      this.novoResponsavelVinculado.responsavelPrincipal ||
      this.responsaveisDoAssistido().filter((r) => r.responsavelPrincipal).length === 0;

    const dto = this.paraVinculoComResponsavel(this.novoResponsavelVinculado, responsavelPrincipal);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiAssistidos}/${assistido.assistidoId}/responsaveis/cadastrar-vincular`,
          dto,
        ),
      );

      this.mostrarFormNovoResponsavelVinculado.set(false);
      this.salvandoResponsavelVinculado.set(false);
      this.carregarResponsaveis(assistido.assistidoId);
    } catch (erro) {
      console.error('Erro ao vincular responsável:', erro);
      this.erroResponsavelVinculado.set(mensagemErro(erro as HttpErrorResponse, 'Não foi possível salvar o responsável.'));
      this.salvandoResponsavelVinculado.set(false);
    }
  }

  editarChamada(item: FrequenciaAulaDTO): void {
    this.router.navigate(['/chamada'], { queryParams: { data: item.dataAula, aulaId: item.aulaId } });
  }

  abrirEdicaoResponsavel(vinculo: VinculoFamiliarResponseDTO): void {
    this.formEdicaoResponsavel = {
      nomeCompleto: vinculo.nomeResponsavel,
      dataNascimento: vinculo.dataNascimentoResponsavel ?? '',
      cpf: vinculo.cpfResponsavel ?? '',
      telefone: vinculo.telefoneResponsavel ?? '',
      email: vinculo.emailResponsavel ?? '',
      endereco: enderecoParaForm(vinculo.enderecoResponsavel),
      escolaridade: vinculo.escolaridadeResponsavel ?? null,
      estadoCivil: vinculo.estadoCivilResponsavel ?? null,
      profissao: vinculo.profissaoResponsavel ?? '',
      renda: vinculo.rendaResponsavel ?? null,
      parentesco: vinculo.parentesco ?? '',
      responsavelPrincipal: vinculo.responsavelPrincipal,
      contatoEmergencia: vinculo.contatoEmergencia,
      autorizadoRetirada: vinculo.autorizadoRetirada,
    };
    this.erroEdicaoResponsavel.set(null);
    this.responsavelEmEdicao.set(vinculo);
  }

  fecharEdicaoResponsavel(): void {
    this.responsavelEmEdicao.set(null);
  }

  atualizarCampoEdicaoResponsavel(campo: keyof ResponsavelPendente, valor: string | boolean): void {
    this.formEdicaoResponsavel = { ...this.formEdicaoResponsavel, [campo]: valor };
  }

  async salvarEdicaoResponsavel(): Promise<void> {
    const assistido = this.assistidoSelecionado();
    const vinculo = this.responsavelEmEdicao();
    if (!assistido || !vinculo || this.salvandoEdicaoResponsavel()) {
      return;
    }

    const form = this.formEdicaoResponsavel;
    const erroValidacao = this.validarResponsavel(form);
    if (erroValidacao) {
      this.erroEdicaoResponsavel.set(erroValidacao);
      return;
    }

    this.salvandoEdicaoResponsavel.set(true);
    this.erroEdicaoResponsavel.set(null);

    const urlResponsavel = `${this.apiResponsaveis}/${vinculo.responsavelId}`;

    try {
      // o PUT substitui o cadastro inteiro: campos que este form não mostra vêm do registro atual
      const atual = await firstValueFrom(this.http.get<ResponsavelResponseDTO>(urlResponsavel));

      const responsavel: ResponsavelRequestDTO = {
        nomeCompleto: form.nomeCompleto,
        dataNascimento: form.dataNascimento || undefined,
        cpf: form.cpf,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        endereco: enderecoParaPayload(form.endereco),
        observacoes: atual.observacoes ?? undefined,
        escolaridade: form.escolaridade ?? null,
        estadoCivil: form.estadoCivil ?? null,
        profissao: form.profissao?.trim() || null,
        renda: form.renda ?? null,
      };

      const vinculoAtualizado: VinculoFamiliarRequestDTO = {
        responsavelId: vinculo.responsavelId,
        parentesco: form.parentesco || undefined,
        responsavelPrincipal: form.responsavelPrincipal,
        contatoEmergencia: form.contatoEmergencia,
        autorizadoRetirada: form.autorizadoRetirada,
        observacoes: vinculo.observacoes ?? undefined,
      };

      await firstValueFrom(this.http.put(urlResponsavel, responsavel));
      await firstValueFrom(
        this.http.put(
          `${this.apiAssistidos}/${assistido.assistidoId}/responsaveis/${vinculo.responsavelId}`,
          vinculoAtualizado,
        ),
      );

      this.fecharEdicaoResponsavel();
      this.carregarResponsaveis(assistido.assistidoId);
    } catch (erro) {
      this.erroEdicaoResponsavel.set(mensagemErro(erro as HttpErrorResponse, 'Não foi possível salvar o responsável.'));
    } finally {
      this.salvandoEdicaoResponsavel.set(false);
    }
  }
}
