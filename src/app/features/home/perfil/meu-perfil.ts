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
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ArquivoService } from '../../../core/arquivo.service';
import { AuthService } from '../../../core/auth.service';
import { UsuarioService } from '../../../core/usuario.service';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { Input } from '../../../shared/components/input/input';
import { SenhaForca } from '../../../shared/components/senha-forca/senha-forca';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { ROLE_LABELS } from '../../../shared/enum/role-labels';
import { ArquivoResponseDTO } from '../../../shared/models/arquivo/ArquivoResponseDTO';
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
import {
  ImagemInvalidaError,
  comprimirImagem,
  formatarTamanho,
} from '../../../shared/utils/compressao-imagem.util';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { validarPoliticaSenha } from '../../../shared/utils/senha-forca';

const TAMANHO_MAXIMO_ORIGINAL = 20 * 1024 * 1024;
const LADO_MAXIMO_FOTO = 512;
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

@Component({
  selector: 'app-meu-perfil',
  imports: [FormsModule, Input, Button, Avatar, SenhaForca, Icon],
  templateUrl: './meu-perfil.html',
  styleUrl: './meu-perfil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeuPerfil implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly arquivoService = inject(ArquivoService);
  private readonly auth = inject(AuthService);

  readonly EntidadeArquivo = EntidadeArquivo;

  readonly carregando = signal(true);
  readonly erroCarregamento = signal<string | null>(null);
  readonly usuario = signal<UsuarioResponse | null>(null);

  // Formulário de dados pessoais
  readonly nomeCompleto = signal('');
  readonly telefone = signal('');
  readonly salvandoDados = signal(false);
  readonly erroDados = signal<string | null>(null);
  readonly sucessoDados = signal<string | null>(null);

  // Foto de perfil (só envia/remove ao salvar os dados pessoais — CA-FT2.3)
  readonly fotoSalva = signal<ArquivoResponseDTO | null>(null);
  readonly novaFoto = signal<File | null>(null);
  readonly removerFotoAtual = signal(false);
  readonly processandoFoto = signal(false);
  readonly erroFoto = signal<string | null>(null);
  readonly previewUrl = signal<string | null>(null);

  // Formulário de troca de senha (CA-FT2.4)
  readonly senhaAtual = signal('');
  readonly novaSenha = signal('');
  readonly confirmarSenha = signal('');
  readonly salvandoSenha = signal(false);
  readonly erroSenha = signal<string | null>(null);
  readonly sucessoSenha = signal<string | null>(null);

  readonly rotuloPerfil = computed(() => {
    const u = this.usuario();
    if (!u) return '';
    const base = ROLE_LABELS[u.nivelPermissao] ?? u.nivelPermissao;
    return u.administrador ? `${base} · Administrador` : base;
  });

  readonly iniciais = computed(() => {
    const partes = (this.nomeCompleto() || this.usuario()?.nomeCompleto || '')
      .trim()
      .split(/\s+/)
      .filter((p) => p && !PARTICULAS.has(p.toLowerCase()));
    if (partes.length === 0) return '?';
    const primeira = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  });

  readonly temFotoVisivel = computed(() => {
    if (this.novaFoto()) return true;
    if (this.removerFotoAtual()) return false;
    return this.fotoSalva() !== null;
  });

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

  async ngOnInit(): Promise<void> {
    await this.carregarPerfil();
  }

  async carregarPerfil(): Promise<void> {
    this.carregando.set(true);
    this.erroCarregamento.set(null);
    try {
      const dados = await firstValueFrom(this.usuarioService.buscarMeuPerfil());
      this.usuario.set(dados);
      this.nomeCompleto.set(dados.nomeCompleto);
      this.telefone.set(dados.telefone ?? '');
      this.auth.atualizarDadosUsuarioLogado({
        nomeCompleto: dados.nomeCompleto,
        telefone: dados.telefone,
      });

      const arquivos = await this.arquivoService
        .listar(EntidadeArquivo.USUARIO, dados.usuarioId, CategoriaArquivo.FOTO_PERFIL)
        .catch(() => [] as ArquivoResponseDTO[]);
      this.fotoSalva.set(arquivos[0] ?? null);
    } catch (erro) {
      this.erroCarregamento.set(
        mensagemErro(erro as HttpErrorResponse, 'Não foi possível carregar seus dados.'),
      );
    } finally {
      this.carregando.set(false);
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
      this.erroFoto.set('Selecione um arquivo de imagem.');
      return;
    }
    if (original.size > TAMANHO_MAXIMO_ORIGINAL) {
      this.erroFoto.set(`Imagem muito grande (${formatarTamanho(original.size)}). O limite é 20 MB.`);
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
      this.removerFotoAtual.set(false);
    } catch (e) {
      this.erroFoto.set(
        e instanceof ImagemInvalidaError ? e.message : 'Não foi possível processar a imagem.',
      );
    } finally {
      this.processandoFoto.set(false);
    }
  }

  marcarRemocaoFoto(): void {
    this.erroFoto.set(null);
    this.sucessoDados.set(null);
    if (this.novaFoto() && !this.fotoSalva()) {
      this.novaFoto.set(null);
      return;
    }
    this.novaFoto.set(null);
    if (this.fotoSalva()) {
      this.removerFotoAtual.set(true);
    }
  }

  desfazerAlteracaoFoto(): void {
    this.novaFoto.set(null);
    this.removerFotoAtual.set(false);
    this.erroFoto.set(null);
  }

  async salvarDadosPessoais(): Promise<void> {
    const atual = this.usuario();
    if (!atual || this.salvandoDados() || this.processandoFoto()) return;

    this.erroDados.set(null);
    this.sucessoDados.set(null);

    const nome = this.nomeCompleto().trim();
    if (!nome) {
      this.erroDados.set('O nome completo é obrigatório.');
      return;
    }

    const tel = this.telefone().replace(/\D/g, '');
    if (tel && tel.length !== 10 && tel.length !== 11) {
      this.erroDados.set('O telefone deve conter DDD + número (10 ou 11 dígitos).');
      return;
    }

    this.salvandoDados.set(true);
    try {
      const atualizado = await firstValueFrom(
        this.usuarioService.atualizarMeuPerfil({
          nomeCompleto: nome,
          telefone: tel || null,
        }),
      );

      this.usuario.set(atualizado);
      this.nomeCompleto.set(atualizado.nomeCompleto);
      this.telefone.set(atualizado.telefone ?? '');
      this.auth.atualizarDadosUsuarioLogado({
        nomeCompleto: atualizado.nomeCompleto,
        telefone: atualizado.telefone,
      });

      const arquivoNovo = this.novaFoto();
      if (arquivoNovo) {
        const salvo = await this.arquivoService.enviar(
          EntidadeArquivo.USUARIO,
          atualizado.usuarioId,
          CategoriaArquivo.FOTO_PERFIL,
          arquivoNovo,
        );
        this.fotoSalva.set(salvo);
        this.novaFoto.set(null);
        this.removerFotoAtual.set(false);
        this.arquivoService.invalidarFotoPerfil(EntidadeArquivo.USUARIO, atualizado.usuarioId, true);
      } else if (this.removerFotoAtual() && this.fotoSalva()) {
        await this.arquivoService.remover(this.fotoSalva()!.arquivoId);
        this.fotoSalva.set(null);
        this.removerFotoAtual.set(false);
        this.arquivoService.invalidarFotoPerfil(EntidadeArquivo.USUARIO, atualizado.usuarioId, true);
      }

      this.sucessoDados.set('Dados atualizados com sucesso.');
    } catch (erro) {
      this.erroDados.set(
        mensagemErro(erro as HttpErrorResponse, 'Não foi possível salvar as alterações.'),
      );
    } finally {
      this.salvandoDados.set(false);
    }
  }

  async salvarNovaSenha(): Promise<void> {
    if (this.salvandoSenha()) return;

    this.erroSenha.set(null);
    this.sucessoSenha.set(null);

    if (!this.senhaAtual()) {
      this.erroSenha.set('Informe a senha atual.');
      return;
    }

    const erroPolitica = validarPoliticaSenha(this.novaSenha());
    if (erroPolitica) {
      this.erroSenha.set(erroPolitica);
      return;
    }

    if (this.novaSenha() !== this.confirmarSenha()) {
      this.erroSenha.set('As senhas não coincidem.');
      return;
    }

    this.salvandoSenha.set(true);
    try {
      await this.auth.alterarSenha(this.senhaAtual(), this.novaSenha());
      this.senhaAtual.set('');
      this.novaSenha.set('');
      this.confirmarSenha.set('');
      this.sucessoSenha.set('Senha alterada com sucesso.');
    } catch (e) {
      this.erroSenha.set((e as Error).message || 'Não foi possível alterar a senha.');
    } finally {
      this.salvandoSenha.set(false);
    }
  }
}
