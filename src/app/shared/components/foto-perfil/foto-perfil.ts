import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, model, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { Button } from '../button/button';
import { Avatar } from '../avatar/avatar';
import { comprimirImagem, formatarTamanho, ImagemInvalidaError } from '../../utils/compressao-imagem.util';

/** Arquivo original maior que isso nem é processado (celular comum gera 3–8 MB). */
const TAMANHO_MAXIMO_ORIGINAL = 20 * 1024 * 1024;

/**
 * Seletor de foto de perfil: escolhe (galeria ou câmera no celular), recorta em
 * quadrado, comprime para WebP e mostra a prévia. Devolve o arquivo JÁ comprimido.
 *
 * Uso:
 *   <app-foto-perfil [(arquivo)]="fotoPerfil" [obrigatorio]="true" [invalido]="faltouFoto()" />
 *   Edição (mostra a atual até escolher outra):
 *   <app-foto-perfil [(arquivo)]="novaFoto" [entidadeIdAtual]="id" [nomeAtual]="nome" />
 */
let nextId = 0;

@Component({
  selector: 'app-foto-perfil',
  imports: [Icon, Button, Avatar],
  templateUrl: './foto-perfil.html',
  styleUrl: './foto-perfil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FotoPerfil {
  /** Arquivo comprimido (ou null). Two-way: `[(arquivo)]`. */
  arquivo = model<File | null>(null);

  label = input('Foto de perfil');
  obrigatorio = input(false);
  /** Destaca o campo em vermelho (ex.: tentou salvar sem foto). */
  invalido = input(false);
  /** Na edição: dono já salvo — mostra a foto atual enquanto nenhuma nova for escolhida. */
  entidadeIdAtual = input<number | null>(null);
  nomeAtual = input('');
  /** Maior lado da foto final, em px. */
  ladoMaximo = input(512);

  protected readonly inputId = `foto-perfil-${nextId++}`;
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly processando = signal(false);
  protected readonly erro = signal<string | null>(null);

  constructor() {
    // Prévia acompanha o arquivo — inclusive quando o pai zera (abrir modal de novo).
    effect((onCleanup) => {
      const arquivo = this.arquivo();
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

  protected async aoSelecionar(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const original = campo.files?.[0];
    campo.value = ''; // permite escolher o mesmo arquivo de novo
    if (!original) return;

    this.erro.set(null);

    if (!original.type.startsWith('image/')) {
      this.erro.set('Selecione um arquivo de imagem.');
      return;
    }
    if (original.size > TAMANHO_MAXIMO_ORIGINAL) {
      this.erro.set(`Imagem muito grande (${formatarTamanho(original.size)}). O limite é 20 MB.`);
      return;
    }

    this.processando.set(true);
    try {
      const comprimido = await comprimirImagem(original, {
        ladoMaximo: this.ladoMaximo(),
        qualidade: 0.8,
        quadrado: true,
      });
      this.arquivo.set(comprimido);
    } catch (e) {
      this.erro.set(e instanceof ImagemInvalidaError ? e.message : 'Não foi possível processar a imagem.');
    } finally {
      this.processando.set(false);
    }
  }

  protected remover(): void {
    this.arquivo.set(null);
    this.erro.set(null);
  }
}
