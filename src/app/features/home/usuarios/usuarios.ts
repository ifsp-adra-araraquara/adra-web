import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../../environments/environment';

import { Role } from '../../../shared/enum/role.enum';
import { ROLE_LABELS } from '../../../shared/enum/role-labels';

import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { UsuarioRequest } from '../../../shared/models/usuarios/UsuarioRequest';
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
import { UsuarioStatusRequest } from '../../../shared/models/usuarios/UsuarioStatusRequest';

import { CadastroUsuario } from '../../usuarios/cadastro/cadastro-usuario';
import { DefinirSenha } from '../../usuarios/senha/definir-senha';

@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, CadastroUsuario, DefinirSenha],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Usuarios implements OnInit {
  private http = inject(HttpClient);

  Role = Role;
  labels = ROLE_LABELS;

  private readonly apiUrl = `${environment.apiUrl}/api/usuarios`;

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
    especialidade: null,
    cargoFuncao: '',
    telefone: '',
  };

  // Modais dos componentes do Pedrão, abertos por cima
  mostrarModalCadastro = signal(false);
  mostrarModalSenha = signal(false);
  mostrarModalStatus = signal(false);
  usuarioSelecionadoStatus = signal<UsuarioResponse | null>(null);
  acaoStatus = signal<'inativar' | 'reativar'>('inativar');

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

  /* ===== Modal de definir senha (componente do Pedrão) ===== */
  abrirModalSenha(): void {
    this.mostrarModalSenha.set(true);
  }

  fecharModalSenha(): void {
    this.mostrarModalSenha.set(false);
  }

  /* ===== Modal de edição ===== */
  abrirModalEditarUsuario(usuario: UsuarioResponse): void {
    this.usuarioSelecionado.set(usuario);

    this.usuarioEdicao = {
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      nivelPermissao: usuario.nivelPermissao,
      especialidade: usuario.especialidade,
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

  alterarStatus(usuario: UsuarioResponse): void {
    this.usuarioSelecionadoStatus.set(usuario);
    this.acaoStatus.set(usuario.ativo ? 'inativar' : 'reativar');
    this.mostrarModalStatus.set(true);
  }

  confirmarAlteracaoStatus(): void {
    const usuario = this.usuarioSelecionadoStatus();
    if (usuario) {
      const novoStatus = this.acaoStatus() === 'reativar';
      this.executarAlteracaoStatus(usuario, novoStatus);
    }
    this.mostrarModalStatus.set(false);
    this.usuarioSelecionadoStatus.set(null);
  }

  private executarAlteracaoStatus(usuario: UsuarioResponse, ativo: boolean): void {
    const request: UsuarioStatusRequest = { ativo };

    this.http
      .patch<UsuarioResponse>(`${this.apiUrl}/${usuario.usuarioId}/status`, request)
      .subscribe({
        next: () => this.carregarUsuarios(),
        error: (erro) => console.error('Erro ao alterar status:', erro),
      });
  }

  getNomePerfil(perfil: Role): string {
    return this.labels[perfil] ?? perfil;
  }

  getBadgeClass(perfil: Role): string {
    switch (perfil) {
      case Role.ADMIN:
        return 'b-gray';
      case Role.COORD:
        return 'b-green';
      case Role.SOCIO:
        return 'b-teal';
      case Role.PROFS:
        return 'b-blue';
      case Role.FINANCEIRO:
        return 'b-amber';
      case Role.OFICINEIRO:
        return 'b-coral';
      default:
        return 'b-gray';
    }
  }
}
