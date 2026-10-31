import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../../environments/environment';

import { Role } from '../../../shared/enum/role.enum';
import { PERFIL_OPTIONS, ROLE_LABELS } from '../../../shared/enum/role-labels';

import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { UsuarioRequest } from '../../../shared/models/usuarios/UsuarioRequest';
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
import { UsuarioStatusRequest } from '../../../shared/models/usuarios/UsuarioStatusRequest';
import { RedefinicaoSenhaResponse } from '../../../shared/models/usuarios/RedefinicaoSenhaResponse';

import { CadastroUsuario } from '../../usuarios/cadastro/cadastro-usuario';
import { AuthService } from '../../../core/auth.service';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { Modal } from '../../../shared/components/modal/modal';
import { Badge } from '../../../shared/components/badge/badge';
import { BadgeVariant } from '../../../shared/utils/badge-status.util';
import { Icon } from '../../../shared/components/icon/icon';
import { ActionMenu, ActionMenuItem } from '../../../shared/components/action-menu/action-menu';

@Component({
  selector: 'app-usuarios',
  imports: [ActionMenu, Icon, FormsModule, CadastroUsuario, Select, Input, Button, Modal, Badge],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Usuarios implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  usuarioLogadoId = computed(() => this.authService.currentUserResponse()?.usuarioId ?? null);
  erroGeral = signal<string | null>(null);
  avisoGeral = signal<string | null>(null);

  Role = Role;
  labels = ROLE_LABELS;

  private readonly apiUrl = `${environment.apiUrl}/api/usuarios`;

  perfilFiltroOptions: SelectOption<Role | ''>[] = [
    { value: '', label: 'Todos os perfis' },
    ...PERFIL_OPTIONS
  ];

  statusFiltroOptions: SelectOption<'ativo' | 'inativo' | ''>[] = [
    { value: '', label: 'Todos os status' },
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' }
  ];

  perfilEdicaoOptions: SelectOption<Role>[] = PERFIL_OPTIONS;
  
  carregando = signal(false);
  salvando = signal(false);

  // Paginação
  pagina = signal(0);
  readonly tamanho = 20;
  totalPaginas = signal(0);
  totalElementos = signal(0);
  usuarios = signal<UsuarioResponse[]>([]);

  temAnterior = computed(() => this.pagina() > 0);
  temProxima = computed(() => this.pagina() < this.totalPaginas() - 1);

  // Busca e filtros
  termoBusca = signal('');
  filtroPerfil = signal<Role | ''>('');
  filtroStatus = signal<'ativo' | 'inativo' | ''>('');

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Modal de EDIÇÃO
  mostrarModalEdicao = signal(false);
  usuarioSelecionado = signal<UsuarioResponse | null>(null);
  erroEdicao = signal<string | null>(null);

  // Confirmação de troca de perfil
  mostrarConfirmacaoPerfil = signal(false);

  usuarioEdicao: UsuarioRequest = {
    nomeCompleto: '',
    email: '',
    nivelPermissao: Role.COORD,
    cargoFuncao: '',
    telefone: '',
  };

  // Modais dos componentes do Pedrão, abertos por cima
  mostrarModalCadastro = signal(false);
  mostrarModalStatus = signal(false);
  usuarioSelecionadoStatus = signal<UsuarioResponse | null>(null);
  acaoStatus = signal<'inativar' | 'reativar'>('inativar');

  // Modal de redefinição de senha
  usuarioRedefinicao = signal<UsuarioResponse | null>(null);
  redefinicao = signal<RedefinicaoSenhaResponse | null>(null);
  gerandoRedefinicao = signal(false);
  erroRedefinicao = signal<string | null>(null);
  linkCopiado = signal(false);

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  carregarUsuarios(): void {
    this.carregando.set(true);

    let params = new HttpParams()
      .set('pagina', this.pagina())
      .set('tamanho', this.tamanho);

    const busca = this.termoBusca().trim();
    if (busca) params = params.set('busca', busca);

    const perfil = this.filtroPerfil();
    if (perfil) params = params.set('perfil', perfil);

    const status = this.filtroStatus();
    if (status) params = params.set('ativo', status === 'ativo');

    this.http.get<PaginaResponse<UsuarioResponse>>(this.apiUrl, { params }).subscribe({
      next: (resp) => {
        this.usuarios.set(resp.conteudo);
        this.totalPaginas.set(resp.totalPaginas);
        this.totalElementos.set(resp.totalElementos);
        this.carregando.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar usuários:', erro);
        this.carregando.set(false);
      },
    });
  }

  onBuscaChange(valor: string): void {
    this.termoBusca.set(valor);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.pagina.set(0);
      this.carregarUsuarios();
    }, 350);
  }

  onFiltroChange(): void {
    this.pagina.set(0);
    this.carregarUsuarios();
  }

  paginaAnterior(): void {
    if (this.temAnterior()) {
      this.pagina.update((p) => p - 1);
      this.carregarUsuarios();
    }
  }

  proximaPagina(): void {
    if (this.temProxima()) {
      this.pagina.update((p) => p + 1);
      this.carregarUsuarios();
    }
  }

  /* ===== Modal de cadastro (componente do Pedrão) ===== */
  abrirModalCadastro(): void {
    this.mostrarModalCadastro.set(true);
  }

  fecharModalCadastro(): void {
    this.mostrarModalCadastro.set(false);
    this.carregarUsuarios();
  }

  /* ===== Convite ===== */
  isConvitePendente(usuario: UsuarioResponse): boolean {
    return usuario.ativo && !usuario.ultimoLogin;
  }

  reenviarConvite(usuario: UsuarioResponse): void {
    this.erroGeral.set(null);
    this.avisoGeral.set(null);

    this.http.post<void>(`${this.apiUrl}/${usuario.usuarioId}/convite`, null).subscribe({
      next: () => this.avisoGeral.set(`Convite reenviado para ${usuario.email}.`),
      error: (erro) => this.erroGeral.set(erro.error?.mensagem ?? 'Não foi possível reenviar o convite.'),
    });
  }

  /* ===== Modal de redefinição de senha ===== */
  abrirModalRedefinicao(usuario: UsuarioResponse): void {
    this.usuarioRedefinicao.set(usuario);
    this.redefinicao.set(null);
    this.erroRedefinicao.set(null);
    this.linkCopiado.set(false);
  }

  fecharModalRedefinicao(): void {
    this.usuarioRedefinicao.set(null);
  }

  gerarRedefinicao(): void {
    const usuario = this.usuarioRedefinicao();
    if (!usuario || this.gerandoRedefinicao()) return;

    this.erroRedefinicao.set(null);
    this.gerandoRedefinicao.set(true);

    this.http
      .post<RedefinicaoSenhaResponse>(`${this.apiUrl}/${usuario.usuarioId}/redefinicao-senha`, null)
      .subscribe({
        next: (resposta) => {
          this.redefinicao.set(resposta);
          this.gerandoRedefinicao.set(false);
          this.copiarLink();
        },
        error: (erro) => {
          this.erroRedefinicao.set(erro.error?.mensagem ?? 'Não foi possível gerar o link de redefinição.');
          this.gerandoRedefinicao.set(false);
        },
      });
  }

  async copiarLink(): Promise<void> {
    const link = this.redefinicao()?.link;
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      this.linkCopiado.set(true);
    } catch {
      this.linkCopiado.set(false);
    }
  }

  /* ===== Modal de edição ===== */
  abrirModalEditarUsuario(usuario: UsuarioResponse): void {
    this.usuarioSelecionado.set(usuario);

    this.usuarioEdicao = {
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      nivelPermissao: usuario.nivelPermissao,
      cargoFuncao: usuario.cargoFuncao ?? '',
      telefone: usuario.telefone ?? '',
    };

    this.erroEdicao.set(null);
    this.mostrarModalEdicao.set(true);
  }

  fecharModalEdicao(): void {
    this.mostrarModalEdicao.set(false);
    this.usuarioSelecionado.set(null);
    this.erroEdicao.set(null);
  }

  /** Perfil muda o que a pessoa pode acessar: confirma antes de salvar. */
  salvarEdicao(): void {
    if (this.salvando()) return;

    const usuario = this.usuarioSelecionado();
    if (!usuario) return;

    if (this.usuarioEdicao.nivelPermissao !== usuario.nivelPermissao) {
      this.mostrarConfirmacaoPerfil.set(true);
      return;
    }

    this.confirmarSalvarEdicao();
  }

  confirmarSalvarEdicao(): void {
    const usuario = this.usuarioSelecionado();
    if (!usuario) return;

    this.mostrarConfirmacaoPerfil.set(false);
    this.erroEdicao.set(null);
    this.salvando.set(true);

    this.http
      .put<UsuarioResponse>(`${this.apiUrl}/${usuario.usuarioId}`, this.usuarioEdicao)
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.fecharModalEdicao();
          this.carregarUsuarios();
        },
        error: (erro) => {
          this.erroEdicao.set(erro.error?.mensagem ?? 'Não foi possível salvar as alterações.');
          this.salvando.set(false);
        },
      });
  }

  /** Menu ">" da linha. Inativar a própria conta não aparece (antes era um botão desabilitado). */
  acoesUsuario(usuario: UsuarioResponse): ActionMenuItem[] {
    const itens: ActionMenuItem[] = [];
    if (this.isConvitePendente(usuario)) {
      itens.push({ id: 'convite', label: 'Reenviar convite', icon: 'mail' });
    }
    itens.push(
      { id: 'editar', label: 'Editar', icon: 'edit' },
      { id: 'senha', label: 'Redefinir senha', icon: 'lock' },
    );
    if (!usuario.ativo) {
      itens.push({ id: 'status', label: 'Reativar', icon: 'rotate-ccw' });
    } else if (!this.isProprioUsuario(usuario)) {
      itens.push({ id: 'status', label: 'Inativar', icon: 'power', danger: true });
    }
    return itens;
  }

  executarAcaoUsuario(acao: string, usuario: UsuarioResponse): void {
    switch (acao) {
      case 'convite':
        this.reenviarConvite(usuario);
        break;
      case 'editar':
        this.abrirModalEditarUsuario(usuario);
        break;
      case 'senha':
        this.abrirModalRedefinicao(usuario);
        break;
      case 'status':
        this.alterarStatus(usuario);
        break;
    }
  }

  isProprioUsuario(usuario: UsuarioResponse): boolean {
    return this.usuarioLogadoId() === usuario.usuarioId;
  }

  alterarStatus(usuario: UsuarioResponse): void {
    if (this.isProprioUsuario(usuario) && usuario.ativo) {
      return;
    }
    this.usuarioSelecionadoStatus.set(usuario);
    this.acaoStatus.set(usuario.ativo ? 'inativar' : 'reativar');
    this.mostrarModalStatus.set(true);
  }

  confirmarAlteracaoStatus(): void {
    const usuario = this.usuarioSelecionadoStatus();
    if (usuario) {
      if (this.isProprioUsuario(usuario) && this.acaoStatus() === 'inativar') {
        this.mostrarModalStatus.set(false);
        this.usuarioSelecionadoStatus.set(null);
        return;
      }
      const novoStatus = this.acaoStatus() === 'reativar';
      this.executarAlteracaoStatus(usuario, novoStatus);
    }
    this.mostrarModalStatus.set(false);
    this.usuarioSelecionadoStatus.set(null);
  }

  private executarAlteracaoStatus(usuario: UsuarioResponse, ativo: boolean): void {
    const request: UsuarioStatusRequest = { ativo };
    this.erroGeral.set(null);

    this.http
      .patch<UsuarioResponse>(`${this.apiUrl}/${usuario.usuarioId}/status`, request)
      .subscribe({
        next: () => this.carregarUsuarios(),
        error: (erro) => {
          console.error('Erro ao alterar status:', erro);
          this.erroGeral.set(erro.error?.mensagem ?? 'Não foi possível alterar o status do usuário.');
        },
      });
  }

  getNomePerfil(perfil: Role): string {
    return this.labels[perfil] ?? perfil;
  }

  getBadgeVariant(perfil: Role): BadgeVariant {
    switch (perfil) {
      case Role.COORD:
        return 'green';
      case Role.ASSISTENTE:
        return 'blue';
      case Role.EDUCADOR:
        return 'teal';
      case Role.OFICINEIRO:
        return 'coral';
      default:
        return 'gray';
    }
  }
}
