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
import { VinculoFamiliarRequestDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarRequestDTO';
import { VinculoFamiliarResponseDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarResponseDTO';
import { ResponsavelResponseDTO } from '../../../shared/models/responsavel/ResponsavelResponseDTO';

import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { cpfValido } from '../../../shared/validators/cpf.validator';
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
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { SEXO_LABELS, Sexo } from '../../../shared/enum/Sexo';
import { ESCOLARIDADE_LABELS, Escolaridade } from '../../../shared/enum/Escolaridade';
import { ESTADO_CIVIL_LABELS, EstadoCivil } from '../../../shared/enum/EstadoCivil';
import { enderecoParaForm, enderecoParaPayload, formatarEndereco } from '../../../shared/utils/endereco.util';
import { formatarMoeda } from '../../../shared/utils/mascara.util';
import { DadosComplementaresAssistidoForm, SEXO_OPTIONS } from './dados-complementares/dados-complementares-assistido';
import { DadosComplementaresResponsavelForm } from '../responsaveis/dados-complementares/dados-complementares-responsavel';
import { SocioeconomicoAssistidoForm } from './socioeconomico/socioeconomico-assistido';
import { TermosAssistidoForm } from './termos/termos-assistido';
import { ElegibilidadeDTO } from '../../../shared/models/assistido/ElegibilidadeDTO';
import {
  PROGRAMA_TRANSFERENCIA_LABELS,
  ProgramaTransferencia,
} from '../../../shared/enum/ProgramaTransferencia';

import {
  assistidoVazio,
  PARENTESCO_OPTIONS,
  paraPayloadAssistido,
  paraVinculoComResponsavel,
  ResponsavelPendente,
  responsavelVazio,
  validarDadosComplementares,
  validarResponsavel,
} from './assistido-form.util';

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
    return perfil === Role.COORD || perfil === Role.ASSISTENTE;
  });
  /** Documentos pessoais (RG/CPF) — mesmos perfis que o back libera em /api/arquivos (sem oficineiro). */
  readonly podeVerDocumentos = computed(() => {
    const perfil = this.auth.currentProfile();
    return perfil === Role.COORD || perfil === Role.ASSISTENTE || perfil === Role.EDUCADOR;
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
  formEdicaoResponsavel: ResponsavelPendente = responsavelVazio();
  salvandoEdicaoResponsavel = signal(false);
  erroEdicaoResponsavel = signal<string | null>(null);

  mostrarFormNovoResponsavelVinculado = signal(false);
  salvandoResponsavelVinculado = signal(false);
  erroResponsavelVinculado = signal<string | null>(null);
  novoResponsavelVinculado: ResponsavelPendente = responsavelVazio();

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

  turmaEdicaoOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Sem turma' },
    ...this.turmas().map((turma) => ({ value: turma.turmaId, label: turma.nomeTurma })),
  ]);

  readonly parentescoOptions = PARENTESCO_OPTIONS;
  readonly sexoOptions = SEXO_OPTIONS;

  /* Modal editar assistido */
  mostrarModalEditar = signal(false);
  secaoEdicao = signal<'dados' | 'turma'>('dados');
  salvandoEdicao = signal(false);
  erroSalvarEdicao = signal<string | null>(null);
  assistidoEmEdicao = signal<AssistidoResponseDTO | null>(null);
  formEdicaoAssistido: AssistidoRequestDTO = assistidoVazio();
  /** Nova foto escolhida na edição (null = mantém a atual). */
  fotoPerfilEdicao = signal<File | null>(null);
  /** Novo arquivo do RG/CPF na edição (vazio = mantém o atual). */
  documentosIdentidadeEdicao = signal<File[]>([]);

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
    this.novoResponsavelVinculado = responsavelVazio();
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

  /** Cadastro vindo de importação em lote, ainda sem CPF e/ou nascimento confirmados. */
  cadastroPendente(a: AssistidoResponseDTO): string | null {
    const faltando = [!a.cpf && 'CPF', !a.dataNascimento && 'data de nascimento'].filter(Boolean);
    return faltando.length ? `Falta confirmar: ${faltando.join(' e ')}` : null;
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

  calcularIdade(dataNascimento: string | null): number | null {
    if (!dataNascimento) return null;
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
  /** Cadastro novo é uma página própria (antes era modal): /assistidos/novo. */
  abrirCadastroNovo(): void {
    this.router.navigate(['/assistidos/novo']);
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
      dataNascimento: assistido.dataNascimento ?? '',
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

    if (!cpfValido(this.formEdicaoAssistido.cpf ?? '')) {
      this.erroSalvarEdicao.set('Informe um CPF válido para o assistido.');
      return;
    }

    const erroComplementares = validarDadosComplementares(this.formEdicaoAssistido);
    if (erroComplementares) {
      this.erroSalvarEdicao.set(erroComplementares);
      return;
    }

    this.salvandoEdicao.set(true);
    this.erroSalvarEdicao.set(null);

    try {
      const payload: AssistidoRequestDTO = {
        ...paraPayloadAssistido(this.formEdicaoAssistido),
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
  formSocioeconomico: AssistidoRequestDTO = assistidoVazio();

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

    const erro = validarDadosComplementares(this.formSocioeconomico);
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
          paraPayloadAssistido(this.formSocioeconomico),
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

  async salvarResponsavelVinculado(): Promise<void> {
    const assistido = this.assistidoSelecionado();
    if (!assistido || this.salvandoResponsavelVinculado()) {
      return;
    }

    const erroValidacao = validarResponsavel(this.novoResponsavelVinculado);
    if (erroValidacao) {
      this.erroResponsavelVinculado.set(erroValidacao);
      return;
    }

    this.salvandoResponsavelVinculado.set(true);
    this.erroResponsavelVinculado.set(null);

    const responsavelPrincipal =
      this.novoResponsavelVinculado.responsavelPrincipal ||
      this.responsaveisDoAssistido().filter((r) => r.responsavelPrincipal).length === 0;

    const dto = paraVinculoComResponsavel(this.novoResponsavelVinculado, responsavelPrincipal);

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
    this.router.navigate(['/chamada/aula', item.aulaId]);
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
    const erroValidacao = validarResponsavel(form);
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
