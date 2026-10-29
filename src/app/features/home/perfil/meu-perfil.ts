import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth.service';
import { UsuarioService } from '../../../core/usuario.service';
import { ArquivoService } from '../../../core/arquivo.service';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { Role } from '../../../shared/enum/role.enum';
import { ROLE_LABELS } from '../../../shared/enum/role-labels';
import { ArquivoResponseDTO } from '../../../shared/models/arquivo/ArquivoResponseDTO';
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Icon } from '../../../shared/components/icon/icon';
import { SenhaForca } from '../../../shared/components/senha-forca/senha-forca';
import { validarPoliticaSenha } from '../../../shared/utils/senha-forca';
import {
  comprimirImagem,
  formatarTamanho,
  ImagemInvalidaError,
} from '../../../shared/utils/compressao-imagem.util';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

const TAMANHO_MAXIMO_ORIGINAL = 20 * 1024 * 1024;
const LADO_MAXIMO_FOTO = 512;

@Component({
  selector: 'app-meu-perfil',
  imports: [FormsModule, Input, Button, Avatar, Icon, SenhaForca],
  templateUrl: './meu-perfil.html',
  styleUrl: './meu-perfil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeuPerfil implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly arquivoService = inject(ArquivoService);

  readonly EntidadeArquivo = EntidadeArquivo;

  usuario = signal<UsuarioResponse | null>(this.authService.currentUserResponse());
  carregando = signal(false);

  // Dados pessoais editáveis
  nomeCompleto = '';
  telefone = '';

  // Estado de salvamento dos dados / foto
  salvandoDados = signal(false);
  erroDados = signal<string | null>(null);
  sucessoDados = signal<string | null>(null);

  // Foto de perfil
  fotoSalva = signal<ArquivoResponseDTO | null>(null);
  novaFoto = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  processandoFoto = signal(false);
  removendoFoto = signal(false);
  erroFoto = signal<string | null>(null);

  // Troca de senha
  senhaAtual = '';
  novaSenha = '';
  confirmarSenha = '';
  salvandoSenha = signal(false);
  erroSenha = signal<string | null>(null);
  sucessoSenha = signal<string | null>(null);

  nomePerfil = computed(() => {
    const perfil = this.usuario()?.nivelPermissao as Role | undefined;
    return perfil ? (ROLE_LABELS[perfil] ?? perfil) : '';
  });

  temFotoExibida = computed(() => !!this.novaFoto() || !!this.fotoSalva());

  constructor() {
    effect((onCleanup) => {
      const arquivo = this.novaFoto();
      if (!arquivo) {
        this.previewUrl.set(null);
        return;
      }
      const url = URL.createObjectURL(arquivo);
      this.previewUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });

    inject(DestroyRef).onDestroy(() => {
      const url = this.previewUrl();
      if (url) URL.revokeObjectURL(url);
    });
  }

  ngOnInit(): void {
    const atual = this.authService.currentUserResponse();
    if (atual) {
      this.preencherFormulario(atual);
    }
    this.carregarMeuPerfil();
  }

  carregarMeuPerfil(): void {
    this.carregando.set(true);
    this.usuarioService.buscarMeuPerfil().subscribe({
      next: (dados) => {
        this.usuario.set(dados);
        this.preencherFormulario(dados);
        this.authService.atualizarUsuarioLogado(dados);
        this.carregando.set(false);
        this.carregarFotoAtual(dados.usuarioId);
      },
      error: (erro: HttpErrorResponse) => {
        this.erroDados.set(mensagemErro(erro, 'Não foi possível carregar os dados do seu perfil.'));
        this.carregando.set(false);
        const id = this.usuario()?.usuarioId;
        if (id) this.carregarFotoAtual(id);
      },
    });
  }

  private preencherFormulario(dados: UsuarioResponse): void {
    this.nomeCompleto = dados.nomeCompleto ?? '';
    this.telefone = dados.telefone ?? '';
  }

  private async carregarFotoAtual(usuarioId: number): Promise<void> {
    try {
      const [foto] = await this.arquivoService.listar(
        EntidadeArquivo.USUARIO,
        usuarioId,
        CategoriaArquivo.FOTO_PERFIL,
      );
      this.fotoSalva.set(foto ?? null);
    } catch {
      this.fotoSalva.set(null);
    }
  }

  async aoSelecionarFoto(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const original = campo.files?.[0];
    campo.value = '';
    if (!original) return;

    this.erroFoto.set(null);
    this.sucessoDados.set(null);

    if (!original.type.startsWith('image/')) {
      this.erroFoto.set('Selecione um arquivo de imagem válido (JPEG, PNG ou WebP).');
      return;
    }
    if (original.size > TAMANHO_MAXIMO_ORIGINAL) {
      this.erroFoto.set(
        `Imagem muito grande (${formatarTamanho(original.size)}). O limite é 20 MB.`,
      );
      return;
    }

    this.processandoFoto.set(true);
    try {
      const comprimido = await comprimirImagem(original, {
        ladoMaximo: LADO_MAXIMO_FOTO,
        qualidade: 0.8,
        quadrado: true,
      });
      this.novaFoto.set(comprimido);
    } catch (e) {
      this.erroFoto.set(
        e instanceof ImagemInvalidaError ? e.message : 'Não foi possível processar a imagem.',
      );
    } finally {
      this.processandoFoto.set(false);
    }
  }

  cancelarNovaFoto(): void {
    this.novaFoto.set(null);
    this.erroFoto.set(null);
  }

  async removerFotoSalva(): Promise<void> {
    const foto = this.fotoSalva();
    const usuarioAtual = this.usuario();
    if (!foto || !usuarioAtual || this.removendoFoto()) return;

    this.removendoFoto.set(true);
    this.erroFoto.set(null);
    this.erroDados.set(null);
    this.sucessoDados.set(null);

    try {
      await this.arquivoService.remover(foto.arquivoId);
      this.fotoSalva.set(null);
      this.novaFoto.set(null);
      this.arquivoService.invalidarFotoPerfil(EntidadeArquivo.USUARIO, usuarioAtual.usuarioId);
      this.sucessoDados.set('Foto de perfil removida com sucesso.');
    } catch (erro) {
      this.erroFoto.set(
        mensagemErro(erro as HttpErrorResponse, 'Não foi possível remover a foto de perfil.'),
      );
    } finally {
      this.removendoFoto.set(false);
    }
  }

  async salvarDados(): Promise<void> {
    if (this.salvandoDados()) return;

    this.erroDados.set(null);
    this.erroFoto.set(null);
    this.sucessoDados.set(null);

    const nomeLimpo = this.nomeCompleto.trim();
    if (!nomeLimpo) {
      this.erroDados.set('O nome completo é obrigatório.');
      return;
    }

    const digitosTelefone = (this.telefone ?? '').replace(/\D/g, '');
    if (digitosTelefone.length > 0 && digitosTelefone.length !== 10 && digitosTelefone.length !== 11) {
      this.erroDados.set('O telefone deve conter DDD + número (10 ou 11 dígitos).');
      return;
    }

    this.salvandoDados.set(true);
    try {
      const atualizado = await firstValueFrom(
        this.usuarioService.atualizarMeuPerfil({
          nomeCompleto: nomeLimpo,
          telefone: digitosTelefone,
        }),
      );

      this.usuario.set(atualizado);
      this.preencherFormulario(atualizado);
      this.authService.atualizarUsuarioLogado(atualizado);

      const arquivoFoto = this.novaFoto();
      if (arquivoFoto) {
        try {
          const salvo = await this.arquivoService.enviar(
            EntidadeArquivo.USUARIO,
            atualizado.usuarioId,
            CategoriaArquivo.FOTO_PERFIL,
            arquivoFoto,
          );
          this.fotoSalva.set(salvo);
          this.novaFoto.set(null);
          this.arquivoService.invalidarFotoPerfil(EntidadeArquivo.USUARIO, atualizado.usuarioId);
        } catch (erroUpload) {
          this.erroFoto.set(
            'Dados pessoais salvos, mas não foi possível enviar a foto: ' +
              mensagemErro(erroUpload as HttpErrorResponse, 'tente novamente.'),
          );
          return;
        }
      }

      this.sucessoDados.set('Seus dados foram atualizados com sucesso.');
    } catch (erro) {
      this.erroDados.set(
        mensagemErro(erro as HttpErrorResponse, 'Não foi possível atualizar seus dados.'),
      );
    } finally {
      this.salvandoDados.set(false);
    }
  }

  async alterarSenha(): Promise<void> {
    if (this.salvandoSenha()) return;

    this.erroSenha.set(null);
    this.sucessoSenha.set(null);

    if (!this.senhaAtual) {
      this.erroSenha.set('Informe a sua senha atual.');
      return;
    }

    const erroPolitica = validarPoliticaSenha(this.novaSenha);
    if (erroPolitica) {
      this.erroSenha.set(erroPolitica);
      return;
    }

    if (this.novaSenha !== this.confirmarSenha) {
      this.erroSenha.set('As senhas não coincidem.');
      return;
    }

    this.salvandoSenha.set(true);
    try {
      await this.authService.alterarSenha(this.senhaAtual, this.novaSenha);
      this.senhaAtual = '';
      this.novaSenha = '';
      this.confirmarSenha = '';
      this.sucessoSenha.set('Senha alterada com sucesso. Sua sessão permanece ativa.');
    } catch (e) {
      this.erroSenha.set((e as Error).message || 'Não foi possível alterar a senha.');
    } finally {
      this.salvandoSenha.set(false);
    }
  }
}

