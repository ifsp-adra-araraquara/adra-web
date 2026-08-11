import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';

import { Role } from '../../../shared/enum/role.enum';

import { UsuarioRequest } from '../../../shared/models/usuarios/UsuarioRequest';
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
import { UsuarioStatusRequest } from '../../../shared/models/usuarios/UsuarioStatusRequest';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class Usuarios implements OnInit {

  private http = inject(HttpClient);

  Role = Role;

  private readonly apiUrl =
    `${environment.apiUrl}/api/usuarios`;


  /*
   * Lista de usuários retornada pelo backend.
   */
  usuarios = signal<UsuarioResponse[]>([]);


  /*
   * Controle do modal.
   */
  mostrarModal = signal(false);


  /*
   * Estado de carregamento da lista.
   */
  carregando = signal(false);


  /*
   * Estado de salvamento.
   */
  salvando = signal(false);


  /*
   * Indica se o modal está criando
   * ou editando um usuário.
   */
  editando = signal(false);


  /*
   * Usuário que está sendo editado.
   */
  usuarioSelecionado =
    signal<UsuarioResponse | null>(null);


  /*
   * Dados do formulário.
   *
   * Esses campos correspondem exatamente
   * ao UsuarioRequestDTO do backend.
   */
  novoUsuario: UsuarioRequest = {

    nomeCompleto: '',

    email: '',

    nivelPermissao: Role.COORD,

    especialidade: null,

    cargoFuncao: '',

    telefone: ''

  };


  ngOnInit(): void {

    this.carregarUsuarios();

  }


  /*
   * ============================================================
   * LISTAR USUÁRIOS
   * ============================================================
   *
   * GET /api/usuarios
   */
  carregarUsuarios(): void {

    this.carregando.set(true);

    this.http
      .get<UsuarioResponse[]>(this.apiUrl)
      .subscribe({

        next: (usuarios) => {

          this.usuarios.set(usuarios);

          this.carregando.set(false);

        },

        error: (erro) => {

          console.error(
            'Erro ao carregar usuários:',
            erro
          );

          this.carregando.set(false);

        }

      });

  }


  /*
   * ============================================================
   * NOVO USUÁRIO
   * ============================================================
   */
  abrirModalNovoUsuario(): void {

    this.editando.set(false);

    this.usuarioSelecionado.set(null);


    this.novoUsuario = {

      nomeCompleto: '',

      email: '',

      nivelPermissao: Role.COORD,

      especialidade: null,

      cargoFuncao: '',

      telefone: ''

    };


    this.mostrarModal.set(true);

  }


  /*
   * ============================================================
   * EDITAR USUÁRIO
   * ============================================================
   */
  abrirModalEditarUsuario(
    usuario: UsuarioResponse
  ): void {

    this.editando.set(true);

    this.usuarioSelecionado.set(usuario);


    this.novoUsuario = {

      nomeCompleto:
        usuario.nomeCompleto,

      email:
        usuario.email,

      nivelPermissao:
        usuario.nivelPermissao,

      especialidade:
        usuario.especialidade,

      cargoFuncao:
        usuario.cargoFuncao ?? '',

      telefone:
        usuario.telefone ?? ''

    };


    this.mostrarModal.set(true);

  }


  /*
   * ============================================================
   * FECHAR MODAL
   * ============================================================
   */
  fecharModal(): void {

    this.mostrarModal.set(false);

    this.usuarioSelecionado.set(null);

  }


  /*
   * ============================================================
   * SALVAR
   * ============================================================
   *
   * Novo:
   * POST /api/usuarios
   *
   * Edição:
   * PUT /api/usuarios/{usuarioId}
   */
  salvarUsuario(): void {

    if (this.salvando()) {

      return;

    }


    this.salvando.set(true);


    /*
     * ========================================================
     * EDIÇÃO
     * ========================================================
     */
    if (this.editando()) {

      const usuario =
        this.usuarioSelecionado();


      if (!usuario) {

        this.salvando.set(false);

        return;

      }


      this.http
        .put<UsuarioResponse>(
          `${this.apiUrl}/${usuario.usuarioId}`,
          this.novoUsuario
        )
        .subscribe({

          next: () => {

            this.salvando.set(false);

            this.fecharModal();

            this.carregarUsuarios();

          },

          error: (erro) => {

            console.error(
              'Erro ao editar usuário:',
              erro
            );

            this.salvando.set(false);

          }

        });


      return;

    }


    /*
     * ========================================================
     * CRIAÇÃO
     * ========================================================
     */
    this.http
      .post<UsuarioResponse>(
        this.apiUrl,
        this.novoUsuario
      )
      .subscribe({

        next: () => {

          this.salvando.set(false);

          this.fecharModal();

          this.carregarUsuarios();

        },

        error: (erro) => {

          console.error(
            'Erro ao criar usuário:',
            erro
          );

          this.salvando.set(false);

        }

      });

  }


  /*
   * ============================================================
   * ALTERAR STATUS
   * ============================================================
   *
   * PATCH /api/usuarios/{usuarioId}/status
   *
   * O usuário nunca é deletado.
   */
  alterarStatus(
    usuario: UsuarioResponse
  ): void {

    const request: UsuarioStatusRequest = {

      ativo: !usuario.ativo

    };


    this.http
      .patch<UsuarioResponse>(
        `${this.apiUrl}/${usuario.usuarioId}/status`,
        request
      )
      .subscribe({

        next: () => {

          this.carregarUsuarios();

        },

        error: (erro) => {

          console.error(
            'Erro ao alterar status:',
            erro
          );

        }

      });

  }


  /*
   * ============================================================
   * NOME DO PERFIL
   * ============================================================
   */
  getNomePerfil(
  perfil: Role
): string {

  switch (perfil) {

    case Role.ADMIN:
      return 'Administrador';

    case Role.COORD:
      return 'Coordenador';

    case Role.SOCIO:
      return 'Sociopedagógico';

    case Role.PROFS:
      return 'Profissional de Saúde';

    case Role.FINANCEIRO:
      return 'Financeiro/Adm.';

    case Role.OFICINEIRO:
      return 'Oficineiro';

    default:
      return perfil;

  }

}


  /*
   * ============================================================
   * COR DO BADGE
   * ============================================================
   */
  
getBadgeClass(
  perfil: Role
): string {

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

  /*
   * ============================================================
   * ATUALIZAR CAMPO DO FORMULÁRIO
   * ============================================================
   */
  atualizarCampo(
    campo: keyof UsuarioRequest,
    valor: string | boolean | Role | null
  ): void {

    this.novoUsuario = {

      ...this.novoUsuario,

      [campo]: valor

    };

  }

}