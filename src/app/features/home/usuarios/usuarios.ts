import { Component, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../../environments/environment';

import { Role } from '../../../shared/enum/role.enum';
import { ROLE_LABELS } from '../../../shared/enum/role-labels';

import { UsuarioRequest } from '../../../shared/models/usuarios/UsuarioRequest';
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
import { UsuarioStatusRequest } from '../../../shared/models/usuarios/UsuarioStatusRequest';

import { CadastroUsuario } from '../../usuarios/cadastro/cadastro-usuario';
import { DefinirSenha } from '../../usuarios/senha/definir-senha';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, CadastroUsuario, DefinirSenha],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  private http = inject(HttpClient);

  Role = Role;
  labels = ROLE_LABELS;

  private readonly apiUrl = `${environment.apiUrl}/api/usuarios`;

  usuarios = signal<UsuarioResponse[]>([]);
  carregando = signal(false);
  salvando = signal(false);

  // Modal de EDIÇÃO
  mostrarModalEdicao = signal(false);
  usuarioSelecionado = signal<UsuarioResponse | null>(null);

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
    this.http.get<UsuarioResponse[]>(this.apiUrl).subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.carregando.set(false);
      },
      error: (erro) => {
        console.error('Erro ao carregar usuários:', erro);
        this.carregando.set(false);
      },
    });
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

    this.mostrarModalEdicao.set(true);
  }

  fecharModalEdicao(): void {
    this.mostrarModalEdicao.set(false);
    this.usuarioSelecionado.set(null);
  }

  salvarEdicao(): void {
    if (this.salvando()) return;

    const usuario = this.usuarioSelecionado();
    if (!usuario) return;

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
          console.error('Erro ao editar usuário:', erro);
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
