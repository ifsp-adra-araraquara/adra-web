import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { StatusGeral } from '../../../shared/enum/StatusGeral';

import { AssistidoRequestDTO } from '../../../shared/models/assistido/AssistidoRequestDTO';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { AssistidoStatusRequestDTO } from '../../../shared/models/assistido/AssistidoStatusRequestDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';

import { ResponsavelRequestDTO } from '../../../shared/models/responsavel/ResponsavelRequestDTO';
import { VinculoFamiliarComResponsavelRequestDTO } from '../../../shared/models/vinculoFamiliar/VinculoFamiliarComResponsavelRequestDTO';

import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { Modal } from '../../../shared/components/modal/modal';
import { Badge } from '../../../shared/components/badge/badge';

interface ResponsavelPendente extends ResponsavelRequestDTO {
  parentesco: string;
  responsavelPrincipal: boolean;
  contatoEmergencia: boolean;
  autorizadoRetirada: boolean;
}

@Component({
  selector: 'app-assistidos',
  standalone: true,
  imports: [CommonModule, FormsModule, Select, Input, Button, Modal, Badge],
  templateUrl: './assistidos.html',
  styleUrl: './assistidos.css',
})
export class Assistidos implements OnInit {
  private http = inject(HttpClient);

  StatusGeral = StatusGeral;

  private readonly apiAssistidos = `${environment.apiUrl}/api/assistidos`;
  private readonly apiResponsaveis = `${environment.apiUrl}/api/responsaveis`;
  private readonly apiTurmas = `${environment.apiUrl}/api/turmas`;

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
  turmas = signal<TurmaResponseDTO[]>([]);
  abaAtiva = signal<'todos' | 'ativos' | 'inativos' | 'acomp'>('todos');

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  temFiltrosAtivos = computed(() => {
    return !!this.termoBusca().trim() || this.filtroTurma() !== '' || (this.abaAtiva() !== 'todos' && this.abaAtiva() !== 'acomp');
  });

  mostrarModalStatus = signal(false);
  assistidoSelecionadoStatus = signal<AssistidoResponseDTO | null>(null);
  novoStatusDesejado = signal<StatusGeral>(StatusGeral.INATIVO);

  abaVerAssistido = signal<'dados' | 'fam' | 'cham' | 'disc' | 'prn'>('dados');

  trocarAbaVerAssistido(aba: 'dados' | 'fam' | 'cham' | 'disc' | 'prn') {
    this.abaVerAssistido.set(aba);
  }

  mostrarFormNovoResponsavelVinculado = signal(false);
  salvandoResponsavelVinculado = signal(false);
  erroResponsavelVinculado = signal<string | null>(null);
  novoResponsavelVinculado: ResponsavelPendente = this.responsavelVazio();

  /* Modal novo assistido */
  mostrarModalNovo = signal(false);
  salvando = signal(false);
  erroSalvar = signal<string | null>(null);
  alertaDuplicidade = signal(false);
  duplicadosEncontrados = signal<AssistidoResponseDTO[]>([]);
  novoAssistido: AssistidoRequestDTO = this.assistidoVazio();
  assistidoIdCriado = signal<number | null>(null);
  turmasAtivas = computed(() => this.turmas().filter((turma) => turma.ativo));

  filtroTurmaOptions = computed<SelectOption<number | ''>[]>(() => [
    { value: '', label: 'Todas as turmas' },
    ...this.turmas().map((turma) => ({ value: turma.turmaId, label: turma.nomeTurma })),
  ]);

  turmaNovoAssistidoOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Selecione uma turma ativa' },
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
  salvandoEdicao = signal(false);
  erroSalvarEdicao = signal<string | null>(null);
  assistidoEmEdicao = signal<AssistidoResponseDTO | null>(null);
  formEdicaoAssistido: AssistidoRequestDTO = this.assistidoVazio();

  /* Responsáveis já salvos e vinculados */
  responsaveisVinculados = signal<ResponsavelPendente[]>([]);
  salvandoResponsavel = signal(false);
  erroResponsavel = signal<string | null>(null);

  /* Sub-fluxo de responsáveis dentro do modal */
  responsaveisPendentes = signal<ResponsavelPendente[]>([]);
  novoResponsavel: ResponsavelPendente = this.responsavelVazio();

  ngOnInit(): void {
    this.carregarTurmas();
    this.carregarAssistidos();
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
    this.searchTimeout = setTimeout(() => {
      this.pagina.set(0);
      this.carregarAssistidos();
    }, 350);
  }

  onFiltroTurmaChange(valor: any): void {
    const num = valor === '' || valor === null ? '' : Number(valor);
    this.filtroTurma.set(num);
    this.pagina.set(0);
    this.carregarAssistidos();
  }

  trocarAbaStatus(aba: 'todos' | 'ativos' | 'inativos' | 'acomp'): void {
    this.abaAtiva.set(aba);
    if (aba !== 'acomp') {
      this.pagina.set(0);
      this.carregarAssistidos();
    }
  }

  limparFiltros(): void {
    this.termoBusca.set('');
    this.filtroTurma.set('');
    this.abaAtiva.set('todos');
    this.pagina.set(0);
    this.carregarAssistidos();
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

    let params = new HttpParams()
      .set('pagina', this.pagina().toString())
      .set('tamanho', this.tamanho.toString());

    const busca = this.termoBusca().trim();
    if (busca) {
      params = params.set('busca', busca);
    }

    const turmaId = this.filtroTurma();
    if (turmaId !== '') {
      params = params.set('turmaId', turmaId.toString());
    }

    const aba = this.abaAtiva();
    if (aba === 'ativos') {
      params = params.set('status', StatusGeral.ATIVO);
    } else if (aba === 'inativos') {
      params = params.set('status', StatusGeral.INATIVO);
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
      responsaveis: [],
      confirmarApesarDeDuplicidade: false,
    };
  }

  private responsavelVazio(): ResponsavelPendente {
    return {
      nomeCompleto: '',
      dataNascimento: '',
      cpf: '',
      telefone: '',
      email: '',
      endereco: '',
      observacoes: '',
      parentesco: '',
      responsavelPrincipal: false, // default fixo, sem depender de signal
      contatoEmergencia: false,
      autorizadoRetirada: false,
    };
  }

  abrirModalNovoAssistido(): void {
    this.novoAssistido = this.assistidoVazio();
    this.assistidoIdCriado.set(null);
    this.responsaveisVinculados.set([]);
    this.novoResponsavel = this.responsavelVazio();
    this.erroSalvar.set(null);
    this.erroResponsavel.set(null);
    this.alertaDuplicidade.set(false);
    this.duplicadosEncontrados.set([]);
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
  abrirModalEditarAssistido(assistido: AssistidoResponseDTO): void {
    this.assistidoEmEdicao.set(assistido);
    this.formEdicaoAssistido = {
      nomeCompleto: assistido.nomeCompleto,
      dataNascimento: assistido.dataNascimento,
      cpf: assistido.cpf ?? '',
      dataEntrada: assistido.dataEntrada ?? '',
      necessidadesEspecificas: assistido.necessidadesEspecificas ?? '',
      observacoes: assistido.observacoes ?? '',
      turmaId: assistido.turmaId ?? null,
      responsaveis: [],
      confirmarApesarDeDuplicidade: false,
    };
    this.erroSalvarEdicao.set(null);
    this.mostrarModalEditar.set(true);
  }

  fecharModalEditar(): void {
    this.mostrarModalEditar.set(false);
    this.assistidoEmEdicao.set(null);
    this.erroSalvarEdicao.set(null);
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

    this.salvandoEdicao.set(true);
    this.erroSalvarEdicao.set(null);

    try {
      const payload: AssistidoRequestDTO = {
        ...this.formEdicaoAssistido,
        turmaId: this.formEdicaoAssistido.turmaId ? Number(this.formEdicaoAssistido.turmaId) : null,
      };

      await firstValueFrom(
        this.http.put<AssistidoResponseDTO>(
          `${this.apiAssistidos}/${assistido.assistidoId}`,
          payload,
        ),
      );

      this.salvandoEdicao.set(false);
      this.fecharModalEditar();
      this.carregarAssistidos();
    } catch (erro: any) {
      console.error('Erro ao atualizar assistido:', erro);
      this.erroSalvarEdicao.set(
        erro?.error?.message ?? erro?.message ?? 'Não foi possível salvar as alterações.',
      );
      this.salvandoEdicao.set(false);
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
            params: new HttpParams().set('nome', nome).set('dataNascimento', dataNascimento),
          }),
        );

        this.alertaDuplicidade.set(Boolean(resultado?.possivelDuplicidade));
      } catch {
        this.alertaDuplicidade.set(false);
      }
    }, 400);
  }

  private validarAssistidoAntesSalvar(): string | null {
    if (!this.novoAssistido.nomeCompleto.trim() || !this.novoAssistido.dataNascimento) {
      return 'Preencha nome completo e data de nascimento.';
    }

    if (!this.novoAssistido.turmaId) {
      return 'Selecione uma turma ativa para o assistido.';
    }

    const turmaSelecionada = this.turmas().find((turma) => turma.turmaId === Number(this.novoAssistido.turmaId));
    if (!turmaSelecionada || !turmaSelecionada.ativo) {
      return 'A turma selecionada deve estar ativa.';
    }

    if (this.responsaveisVinculados().length === 0 && this.responsaveisPendentes().length === 0) {
      return 'Informe pelo menos um responsável para o assistido.';
    }

    if (this.alertaDuplicidade() && !this.novoAssistido.confirmarApesarDeDuplicidade) {
      return 'Há uma possível duplicidade de nome e data de nascimento. Confirme para continuar.';
    }

    if (this.novoAssistido.confirmarApesarDeDuplicidade && this.duplicadosEncontrados().length > 0) {
      this.novoAssistido = { ...this.novoAssistido, confirmarApesarDeDuplicidade: true };
    }

    return null;
  }

  /*
   * ============================================================
   * ADICIONAR / REMOVER RESPONSÁVEL PENDENTE
   * (só vira request de verdade quando o assistido for salvo)
   * ============================================================
   */
  adicionarResponsavelPendente(): void {
    if (!this.novoResponsavel.nomeCompleto.trim()) {
      return;
    }

    const ehPrimeiro = this.responsaveisPendentes().length === 0;

    const responsavel: ResponsavelPendente = {
      ...this.novoResponsavel,
      responsavelPrincipal: ehPrimeiro ? true : this.novoResponsavel.responsavelPrincipal,
    };

    this.responsaveisPendentes.update((lista) => [...lista, responsavel]);

    this.novoResponsavel = this.responsavelVazio();
  }

  removerResponsavelPendente(index: number): void {
    this.responsaveisPendentes.update((lista) => lista.filter((_, i) => i !== index));
  }

  /*
   * ============================================================
   * SALVAR
   * ============================================================
   * 1) POST /api/assistidos
   * 2) Para cada responsável pendente:
   *    a) POST /api/responsaveis
   *    b) POST /api/assistidos/{id}/responsaveis (vínculo)
   */
  async salvarAssistido(): Promise<void> {
    if (this.salvando()) {
      return;
    }

    const erroValidacao = this.validarAssistidoAntesSalvar();
    if (erroValidacao) {
      this.erroSalvar.set(erroValidacao);
      return;
    }

    this.salvando.set(true);
    this.erroSalvar.set(null);

    const responsaveisPayload: VinculoFamiliarComResponsavelRequestDTO[] = [
      ...this.responsaveisVinculados().map((responsavel) => ({
        nomeCompleto: responsavel.nomeCompleto,
        dataNascimento: responsavel.dataNascimento || undefined,
        cpf: responsavel.cpf || undefined,
        telefone: responsavel.telefone || undefined,
        email: responsavel.email || undefined,
        endereco: responsavel.endereco || undefined,
        observacoes: responsavel.observacoes || undefined,
        parentesco: responsavel.parentesco || undefined,
        responsavelPrincipal: responsavel.responsavelPrincipal,
        contatoEmergencia: responsavel.contatoEmergencia,
        autorizadoRetirada: responsavel.autorizadoRetirada,
      })),
      ...this.responsaveisPendentes().map((responsavel) => ({
        nomeCompleto: responsavel.nomeCompleto,
        dataNascimento: responsavel.dataNascimento || undefined,
        cpf: responsavel.cpf || undefined,
        telefone: responsavel.telefone || undefined,
        email: responsavel.email || undefined,
        endereco: responsavel.endereco || undefined,
        observacoes: responsavel.observacoes || undefined,
        parentesco: responsavel.parentesco || undefined,
        responsavelPrincipal: responsavel.responsavelPrincipal,
        contatoEmergencia: responsavel.contatoEmergencia,
        autorizadoRetirada: responsavel.autorizadoRetirada,
      })),
    ];

    const payload: AssistidoRequestDTO = {
      ...this.novoAssistido,
      turmaId: Number(this.novoAssistido.turmaId),
      responsaveis: responsaveisPayload,
      confirmarApesarDeDuplicidade: this.novoAssistido.confirmarApesarDeDuplicidade,
    };

    try {
      await firstValueFrom(this.http.post<AssistidoResponseDTO>(this.apiAssistidos, payload));

      this.salvando.set(false);
      this.fecharModalNovoAssistido();
      this.carregarAssistidos();
    } catch (erro: any) {
      console.error('Erro ao salvar assistido:', erro);

      const status = Number(erro?.status ?? 0);
      const payloadErro = erro?.error ?? {};
      const duplicados = Array.isArray(payloadErro.possiveisDuplicados)
        ? payloadErro.possiveisDuplicados
        : [];

      if (status === 409 && duplicados.length > 0) {
        this.alertaDuplicidade.set(true);
        this.duplicadosEncontrados.set(duplicados);
        this.erroSalvar.set(payloadErro.mensagem ?? 'Já existe um assistido com o mesmo nome e data de nascimento.');
        this.salvando.set(false);
        return;
      }

      this.erroSalvar.set(
        erro?.error?.message ?? erro?.message ?? 'Não foi possível salvar. Verifique os dados e tente novamente.',
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
        next: () => this.carregarAssistidos(),
        error: (erro) => console.error('Erro ao alterar status:', erro),
      });
  }

  // ============================================================
  // MODAL: VISUALIZAR ASSISTIDO
  // ============================================================

  mostrarModalVisualizar = signal(false);

  assistidoSelecionado = signal<AssistidoResponseDTO | null>(null);

  responsaveisDoAssistido = signal<any[]>([]);

  carregandoResponsaveis = signal(false);

  erroResponsaveis = signal<string | null>(null);

  abrirModalVisualizarAssistido(assistido: AssistidoResponseDTO): void {
    this.abaVerAssistido.set('dados'); // reset

    this.assistidoSelecionado.set(assistido);

    this.responsaveisDoAssistido.set([]);

    this.erroResponsaveis.set(null);

    this.mostrarModalVisualizar.set(true);

    this.carregarResponsaveis(assistido.assistidoId);
  }

  fecharModalVisualizarAssistido(): void {
    this.mostrarModalVisualizar.set(false);

    this.assistidoSelecionado.set(null);

    this.responsaveisDoAssistido.set([]);

    this.erroResponsaveis.set(null);
  }

  carregarResponsaveis(assistidoId: number): void {
    this.carregandoResponsaveis.set(true);

    this.http.get<any[]>(`${this.apiAssistidos}/${assistidoId}/responsaveis`).subscribe({
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

  calcularIdadeResponsavel(dataNascimento?: string): string {
    if (!dataNascimento) {
      return 'Não informado';
    }

    return `${this.calcularIdade(dataNascimento)} anos`;
  }

  /**
   * Garante que o assistido já foi persistido no backend.
   * Se ainda não foi (usuário está adicionando o 1º responsável
   * antes de clicar em "Salvar assistido"), cria o assistido agora
   * e guarda o ID pra reaproveitar nos próximos responsáveis.
   */
  private async garantirAssistidoCriado(): Promise<number> {
    const idJaCriado = this.assistidoIdCriado();
    if (idJaCriado) {
      return idJaCriado;
    }

    if (!this.novoAssistido.nomeCompleto.trim() || !this.novoAssistido.dataNascimento) {
      throw new Error(
        'Preencha nome completo e data de nascimento do assistido antes de adicionar um responsável.',
      );
    }

    const assistidoCriado = await firstValueFrom(
      this.http.post<AssistidoResponseDTO>(this.apiAssistidos, this.novoAssistido),
    );

    this.assistidoIdCriado.set(assistidoCriado.assistidoId);
    return assistidoCriado.assistidoId;
  }

  async salvarResponsavel(): Promise<void> {
    if (this.salvandoResponsavel()) {
      return;
    }

    if (!this.novoResponsavel.nomeCompleto.trim()) {
      this.erroResponsavel.set('Informe o nome do responsável.');
      return;
    }

    this.salvandoResponsavel.set(true);
    this.erroResponsavel.set(null);
    this.erroSalvar.set(null);

    const responsavelPrincipal =
      this.novoResponsavel.responsavelPrincipal || this.responsaveisVinculados().length === 0;

    if (this.novoResponsavel.responsavelPrincipal) {
      this.responsaveisVinculados.update((lista) =>
        lista.map((responsavel) => ({ ...responsavel, responsavelPrincipal: false })),
      );
    }

    const responsavel: ResponsavelPendente = {
      ...this.novoResponsavel,
      responsavelPrincipal,
    };

    this.responsaveisVinculados.update((lista) => [...lista, responsavel]);
    this.novoResponsavel = this.responsavelVazio();
    this.salvandoResponsavel.set(false);
  }

  async salvarResponsavelVinculado(): Promise<void> {
    const assistido = this.assistidoSelecionado();
    if (!assistido || this.salvandoResponsavelVinculado()) {
      return;
    }

    if (!this.novoResponsavelVinculado.nomeCompleto.trim()) {
      this.erroResponsavelVinculado.set('Informe o nome do responsável.');
      return;
    }

    this.salvandoResponsavelVinculado.set(true);
    this.erroResponsavelVinculado.set(null);

    const responsavelPrincipal =
      this.novoResponsavelVinculado.responsavelPrincipal ||
      this.responsaveisDoAssistido().filter((r) => r.responsavelPrincipal).length === 0;

    const dto: VinculoFamiliarComResponsavelRequestDTO = {
      nomeCompleto: this.novoResponsavelVinculado.nomeCompleto,
      dataNascimento: this.novoResponsavelVinculado.dataNascimento || undefined,
      cpf: this.novoResponsavelVinculado.cpf || undefined,
      telefone: this.novoResponsavelVinculado.telefone || undefined,
      email: this.novoResponsavelVinculado.email || undefined,
      endereco: this.novoResponsavelVinculado.endereco || undefined,
      observacoes: this.novoResponsavelVinculado.observacoes || undefined,
      parentesco: this.novoResponsavelVinculado.parentesco || undefined,
      responsavelPrincipal,
      contatoEmergencia: this.novoResponsavelVinculado.contatoEmergencia,
      autorizadoRetirada: this.novoResponsavelVinculado.autorizadoRetirada,
    };

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
      this.erroResponsavelVinculado.set('Não foi possível salvar o responsável.');
      this.salvandoResponsavelVinculado.set(false);
    }
  }
}
