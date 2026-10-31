import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ArquivoService } from '../../../core/arquivo.service';
import { DisciplinarService } from '../../../core/disciplinar.service';
import { Role } from '../../../shared/enum/role.enum';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { NIVEIS_DISCIPLINARES, NivelDisciplinar, ORDEM_NIVEIS } from '../../../shared/enum/NivelDisciplinar';
import {
  MotivoDisciplinarDTO,
  PendenciasDisciplinaresDTO,
  RegistroDisciplinarDTO,
} from '../../../shared/models/disciplinar/Disciplinar';
import { hojeISO } from '../../../shared/utils/aula.util';
import { dataBr, pendenciaDoRegistro, rotuloSequencia } from '../../../shared/utils/disciplinar.util';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { ActionMenu, ActionMenuItem } from '../../../shared/components/action-menu/action-menu';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Badge } from '../../../shared/components/badge/badge';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { Input } from '../../../shared/components/input/input';
import { Modal } from '../../../shared/components/modal/modal';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { RegistroDisciplinarModal } from '../../../shared/components/registro-disciplinar-modal/registro-disciplinar-modal';

type Aba = 'registros' | 'motivos';
type AcaoRegistro = 'ficha' | 'documento' | 'devolvido' | 'periodo' | 'resolver' | 'arquivar';

/**
 * FT-04: tela do Sistema Disciplinar. Lista geral dos registros (com as
 * pendências no topo), registro de ocorrência e — só para o Coordenador —
 * o cadastro de motivos. A ficha disciplinar de cada assistido fica na
 * ficha dele (Assistidos).
 */
@Component({
  selector: 'app-disciplinar',
  imports: [FormsModule, NgTemplateOutlet, ActionMenu, Avatar, Badge, Button, Icon, Input, Modal, Select, RegistroDisciplinarModal],
  templateUrl: './disciplinar.html',
  styleUrl: './disciplinar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Disciplinar implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly disciplinarService = inject(DisciplinarService);
  private readonly arquivoService = inject(ArquivoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly NIVEIS = NIVEIS_DISCIPLINARES;
  readonly ORDEM_NIVEIS = ORDEM_NIVEIS;
  readonly dataBr = dataBr;
  readonly rotuloSequencia = rotuloSequencia;
  readonly pendenciaDoRegistro = pendenciaDoRegistro;
  readonly hoje = hojeISO();

  readonly ehCoordenador = computed(() => this.auth.currentProfile() === Role.COORD);
  readonly podeRegistrar = computed(() => this.ehCoordenador() || this.auth.currentProfile() === Role.EDUCADOR);
  readonly abaAtiva = signal<Aba>('registros');

  // ---- Pendências (cartões do topo) ----
  readonly pendencias = signal<PendenciasDisciplinaresDTO | null>(null);

  // ---- Lista ----
  readonly registros = signal<RegistroDisciplinarDTO[]>([]);
  readonly carregando = signal(false);
  readonly erroLista = signal<string | null>(null);
  readonly termoBusca = signal('');
  readonly filtroNivel = signal<NivelDisciplinar | ''>('');
  readonly somentePendencias = signal(false);
  readonly incluirArquivados = signal(false);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly totalElementos = signal(0);
  readonly tamanho = 20;
  readonly temAnterior = computed(() => this.pagina() > 0);
  readonly temProxima = computed(() => this.pagina() < this.totalPaginas() - 1);
  readonly temFiltros = computed(
    () => !!this.termoBusca().trim() || !!this.filtroNivel() || this.somentePendencias() || this.incluirArquivados(),
  );
  private buscaTimer: ReturnType<typeof setTimeout> | null = null;

  readonly opcoesNivel: SelectOption<NivelDisciplinar | ''>[] = [
    { value: '', label: 'Todos os níveis' },
    ...ORDEM_NIVEIS.map((n) => ({ value: n, label: NIVEIS_DISCIPLINARES[n].plural })),
  ];

  // ---- Registrar ----
  readonly mostrarRegistro = signal(false);

  // ---- Ações sobre um registro ----
  readonly registroEmAcao = signal<RegistroDisciplinarDTO | null>(null);
  readonly acaoAberta = signal<Exclude<AcaoRegistro, 'ficha' | 'documento'> | null>(null);
  readonly salvandoAcao = signal(false);
  readonly erroAcao = signal<string | null>(null);
  readonly arquivoAssinado = signal<File | null>(null);
  readonly acaoData = signal(this.hoje);
  readonly acaoTexto = signal('');
  readonly acaoInicio = signal('');
  readonly acaoFim = signal('');

  readonly tituloAcao = computed(() => {
    switch (this.acaoAberta()) {
      case 'devolvido':
        return 'Documento devolvido assinado';
      case 'periodo':
        return 'Período da suspensão';
      case 'resolver':
        return this.registroEmAcao()?.consequencia === 'RETORNO_COM_RESPONSAVEL'
          ? 'Conversa com o responsável'
          : 'Passeio perdido';
      case 'arquivar':
        return 'Arquivar registro';
      default:
        return '';
    }
  });

  // ---- Motivos (Coordenador) ----
  readonly motivos = signal<MotivoDisciplinarDTO[]>([]);
  readonly carregandoMotivos = signal(false);
  readonly gruposMotivos = computed(() =>
    ORDEM_NIVEIS.map((nivel) => ({ nivel, motivos: this.motivos().filter((m) => m.nivel === nivel) })),
  );
  readonly mostrarMotivoForm = signal(false);
  readonly motivoEditando = signal<MotivoDisciplinarDTO | null>(null);
  readonly motivoNome = signal('');
  readonly motivoNivel = signal<NivelDisciplinar>(NivelDisciplinar.OCORRENCIA);
  readonly salvandoMotivo = signal(false);
  readonly erroMotivo = signal<string | null>(null);
  readonly opcoesNivelMotivo: SelectOption<NivelDisciplinar>[] = ORDEM_NIVEIS.map((n) => ({
    value: n,
    label: NIVEIS_DISCIPLINARES[n].rotulo,
  }));

  ngOnInit(): void {
    this.carregarPendencias();
    this.carregar();
    this.destroyRef.onDestroy(() => this.buscaTimer && clearTimeout(this.buscaTimer));
  }

  trocarAba(aba: Aba): void {
    this.abaAtiva.set(aba);
    if (aba === 'motivos' && this.motivos().length === 0) this.carregarMotivos();
  }

  // ================= Lista =================

  onBusca(termo: string): void {
    this.termoBusca.set(termo);
    if (this.buscaTimer) clearTimeout(this.buscaTimer);
    this.buscaTimer = setTimeout(() => this.recarregar(), 300);
  }

  onNivel(nivel: NivelDisciplinar | ''): void {
    this.filtroNivel.set(nivel);
    this.recarregar();
  }

  alternarPendencias(): void {
    this.somentePendencias.update((v) => !v);
    this.recarregar();
  }

  alternarArquivados(): void {
    this.incluirArquivados.update((v) => !v);
    this.recarregar();
  }

  limparFiltros(): void {
    this.termoBusca.set('');
    this.filtroNivel.set('');
    this.somentePendencias.set(false);
    this.incluirArquivados.set(false);
    this.recarregar();
  }

  paginaAnterior(): void {
    if (!this.temAnterior()) return;
    this.pagina.update((p) => p - 1);
    this.carregar();
  }

  proximaPagina(): void {
    if (!this.temProxima()) return;
    this.pagina.update((p) => p + 1);
    this.carregar();
  }

  aoRegistrar(): void {
    this.recarregar();
    this.carregarPendencias();
  }

  private recarregar(): void {
    this.pagina.set(0);
    this.carregar();
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erroLista.set(null);
    try {
      const pagina = await this.disciplinarService.listar({
        busca: this.termoBusca(),
        nivel: this.filtroNivel() || null,
        somentePendencias: this.somentePendencias(),
        incluirArquivados: this.incluirArquivados(),
        pagina: this.pagina(),
        tamanho: this.tamanho,
      });
      this.registros.set(pagina.conteudo);
      this.totalPaginas.set(pagina.totalPaginas);
      this.totalElementos.set(pagina.totalElementos);
    } catch (e) {
      this.erroLista.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar os registros.'));
    } finally {
      this.carregando.set(false);
    }
  }

  private async carregarPendencias(): Promise<void> {
    try {
      this.pendencias.set(await this.disciplinarService.buscarPendencias());
    } catch {
      this.pendencias.set(null);
    }
  }

  // ================= Ações do registro =================

  acoesRegistro(r: RegistroDisciplinarDTO): ActionMenuItem[] {
    const itens: ActionMenuItem[] = [{ id: 'ficha', label: 'Ver ficha do assistido', icon: 'user' }];
    if (r.documentoStatus) itens.push({ id: 'documento', label: 'Imprimir documento', icon: 'file-text' });
    if (r.arquivado || !this.ehCoordenador()) return itens;

    if (r.documentoStatus === 'PENDENTE_ASSINATURA') {
      itens.push({ id: 'devolvido', label: 'Marcar como devolvido assinado', icon: 'check' });
    }
    if (r.nivel === NivelDisciplinar.SUSPENSAO) {
      itens.push({ id: 'periodo', label: 'Ajustar período da suspensão', icon: 'calendar' });
    }
    if (r.consequenciaPendente) {
      itens.push({
        id: 'resolver',
        label: r.consequencia === 'RETORNO_COM_RESPONSAVEL' ? 'Registrar conversa com responsável' : 'Registrar passeio perdido',
        icon: 'check-square',
      });
    }
    itens.push({ id: 'arquivar', label: 'Arquivar', icon: 'folder', danger: true });
    return itens;
  }

  executarAcao(acao: string, r: RegistroDisciplinarDTO): void {
    switch (acao as AcaoRegistro) {
      case 'ficha':
        this.router.navigate(['/assistidos'], { queryParams: { assistidoId: r.assistidoId } });
        return;
      case 'documento':
        this.router.navigate(['/disciplinar/documento', r.registroId]);
        return;
      default:
        this.abrirAcao(acao as Exclude<AcaoRegistro, 'ficha' | 'documento'>, r);
    }
  }

  private abrirAcao(acao: Exclude<AcaoRegistro, 'ficha' | 'documento'>, r: RegistroDisciplinarDTO): void {
    this.registroEmAcao.set(r);
    this.erroAcao.set(null);
    this.arquivoAssinado.set(null);
    this.acaoData.set(this.hoje);
    this.acaoTexto.set('');
    this.acaoInicio.set(r.suspensaoInicio ?? this.hoje);
    this.acaoFim.set(r.suspensaoFim ?? this.hoje);
    this.acaoAberta.set(acao);
  }

  fecharAcao(): void {
    this.acaoAberta.set(null);
    this.registroEmAcao.set(null);
  }

  onArquivoAssinado(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.arquivoAssinado.set(arquivo);
  }

  async confirmarAcao(): Promise<void> {
    const r = this.registroEmAcao();
    const acao = this.acaoAberta();
    if (!r || !acao) return;

    const erroValidacao = this.validarAcao(acao);
    if (erroValidacao) {
      this.erroAcao.set(erroValidacao);
      return;
    }

    this.salvandoAcao.set(true);
    this.erroAcao.set(null);
    try {
      switch (acao) {
        case 'devolvido': {
          let arquivoId: number | null = null;
          const arquivo = this.arquivoAssinado();
          if (arquivo) {
            const salvo = await this.arquivoService.enviar(
              EntidadeArquivo.ASSISTIDO,
              r.assistidoId,
              CategoriaArquivo.DOCUMENTO_DISCIPLINAR_ASSINADO,
              arquivo,
            );
            arquivoId = salvo.arquivoId;
          }
          await this.disciplinarService.marcarDocumentoDevolvido(r.registroId, arquivoId);
          break;
        }
        case 'periodo':
          await this.disciplinarService.alterarPeriodoSuspensao(r.registroId, this.acaoInicio(), this.acaoFim());
          break;
        case 'resolver':
          await this.disciplinarService.resolverConsequencia(r.registroId, this.acaoData(), this.acaoTexto().trim());
          break;
        case 'arquivar':
          await this.disciplinarService.arquivar(r.registroId, this.acaoTexto().trim());
          break;
      }
      this.fecharAcao();
      this.carregar();
      this.carregarPendencias();
    } catch (e) {
      this.erroAcao.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível salvar. Tente novamente.'));
    } finally {
      this.salvandoAcao.set(false);
    }
  }

  private validarAcao(acao: Exclude<AcaoRegistro, 'ficha' | 'documento'>): string | null {
    if (acao === 'periodo') {
      if (!this.acaoInicio() || !this.acaoFim()) return 'Informe o início e o fim.';
      if (this.acaoFim() < this.acaoInicio()) return 'O fim não pode ser antes do início.';
    }
    if (acao === 'resolver') {
      if (!this.acaoData()) return 'Informe a data.';
      if (!this.acaoTexto().trim()) return 'Descreva como foi resolvido.';
    }
    if (acao === 'arquivar' && !this.acaoTexto().trim()) return 'Informe o motivo do arquivamento.';
    return null;
  }

  // ================= Motivos =================

  private async carregarMotivos(): Promise<void> {
    this.carregandoMotivos.set(true);
    try {
      this.motivos.set(await this.disciplinarService.listarMotivos(true));
    } catch {
      this.motivos.set([]);
    } finally {
      this.carregandoMotivos.set(false);
    }
  }

  novoMotivo(nivel: NivelDisciplinar = NivelDisciplinar.OCORRENCIA): void {
    this.motivoEditando.set(null);
    this.motivoNome.set('');
    this.motivoNivel.set(nivel);
    this.erroMotivo.set(null);
    this.mostrarMotivoForm.set(true);
  }

  editarMotivo(m: MotivoDisciplinarDTO): void {
    this.motivoEditando.set(m);
    this.motivoNome.set(m.nome);
    this.motivoNivel.set(m.nivel);
    this.erroMotivo.set(null);
    this.mostrarMotivoForm.set(true);
  }

  async salvarMotivo(): Promise<void> {
    const nome = this.motivoNome().trim();
    if (!nome) {
      this.erroMotivo.set('Informe o nome do motivo.');
      return;
    }
    this.salvandoMotivo.set(true);
    this.erroMotivo.set(null);
    try {
      const editando = this.motivoEditando();
      const dto = { nome, nivel: this.motivoNivel(), ativo: editando?.ativo ?? true };
      if (editando) {
        await this.disciplinarService.atualizarMotivo(editando.motivoId, dto);
      } else {
        await this.disciplinarService.criarMotivo(dto);
      }
      this.mostrarMotivoForm.set(false);
      this.carregarMotivos();
    } catch (e) {
      this.erroMotivo.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível salvar o motivo.'));
    } finally {
      this.salvandoMotivo.set(false);
    }
  }

  acoesMotivo(m: MotivoDisciplinarDTO): ActionMenuItem[] {
    return [
      { id: 'editar', label: 'Editar', icon: 'edit' },
      m.ativo
        ? { id: 'status', label: 'Inativar', icon: 'power', danger: true }
        : { id: 'status', label: 'Reativar', icon: 'rotate-ccw' },
    ];
  }

  executarAcaoMotivo(acao: string, m: MotivoDisciplinarDTO): void {
    if (acao === 'editar') this.editarMotivo(m);
    else this.alternarAtivoMotivo(m);
  }

  async alternarAtivoMotivo(m: MotivoDisciplinarDTO): Promise<void> {
    try {
      await this.disciplinarService.atualizarMotivo(m.motivoId, { nome: m.nome, nivel: m.nivel, ativo: !m.ativo });
      this.carregarMotivos();
    } catch {
      // Lista não muda; o próximo carregamento mostra o estado real.
    }
  }
}
