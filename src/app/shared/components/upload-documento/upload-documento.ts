import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, model, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { Button } from '../button/button';
import { TooltipDirective } from '../tooltip/tooltip';
import { comprimirImagem, formatarTamanho, ImagemInvalidaError } from '../../utils/compressao-imagem.util';

/** Original maior que isso nem é processado. */
const TAMANHO_MAXIMO_IMAGEM_ORIGINAL = 20 * 1024 * 1024;
/** PDF não é recomprimido — vai como está, então o limite é o do bucket. */
const TAMANHO_MAXIMO_PDF = 2 * 1024 * 1024;

interface Previa {
  arquivo: File;
  url: string | null; // null para PDF
}

/**
 * Upload de documento (RG, CPF, comprovante...): foto ou PDF, até `maximo` arquivos
 * (ex.: frente e verso). Fotos são redimensionadas e comprimidas no navegador;
 * devolve os arquivos já prontos para envio.
 *
 * Uso:
 *   <app-upload-documento label="RG ou CPF" [(arquivos)]="docs" [maximo]="2" [obrigatorio]="true" />
 */
let nextId = 0;

@Component({
  selector: 'app-upload-documento',
  imports: [Icon, Button, TooltipDirective],
  templateUrl: './upload-documento.html',
  styleUrl: './upload-documento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadDocumento {
  arquivos = model<File[]>([]);

  label = input('Documento');
  /** Texto curto abaixo do rótulo (ex.: "Frente e verso"). */
  dica = input('');
  obrigatorio = input(false);
  invalido = input(false);
  maximo = input(1);
  /** Maior lado da imagem final — 1600 px mantém o documento legível. */
  ladoMaximo = input(1600);

  protected readonly inputId = `upload-documento-${nextId++}`;
  protected readonly processando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly previas = signal<Previa[]>([]);
  protected readonly cheio = computed(() => this.arquivos().length >= this.maximo());

  constructor() {
    // Prévias acompanham a lista — inclusive quando o pai zera ao reabrir o modal.
    effect((onCleanup) => {
      const previas = this.arquivos().map((arquivo) => ({
        arquivo,
        url: arquivo.type.startsWith('image/') ? URL.createObjectURL(arquivo) : null,
      }));
      this.previas.set(previas);
      onCleanup(() => previas.forEach((p) => p.url && URL.revokeObjectURL(p.url)));
    });

    inject(DestroyRef).onDestroy(() => this.previas().forEach((p) => p.url && URL.revokeObjectURL(p.url)));
  }

  protected async aoSelecionar(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const selecionados = Array.from(campo.files ?? []);
    campo.value = '';
    if (selecionados.length === 0) return;

    this.erro.set(null);
    const vagas = this.maximo() - this.arquivos().length;
    if (selecionados.length > vagas) {
      this.erro.set(`Envie no máximo ${this.maximo()} arquivo(s).`);
      selecionados.splice(vagas);
    }

    this.processando.set(true);
    try {
      const prontos: File[] = [];
      for (const original of selecionados) {
        prontos.push(await this.preparar(original));
      }
      this.arquivos.update((atuais) => [...atuais, ...prontos]);
    } catch (e) {
      this.erro.set(e instanceof ImagemInvalidaError ? e.message : 'Não foi possível processar o arquivo.');
    } finally {
      this.processando.set(false);
    }
  }

  protected remover(indice: number): void {
    this.arquivos.update((atuais) => atuais.filter((_, i) => i !== indice));
    this.erro.set(null);
  }

  private async preparar(original: File): Promise<File> {
    if (original.type === 'application/pdf') {
      if (original.size > TAMANHO_MAXIMO_PDF) {
        throw new ImagemInvalidaError(
          `PDF muito grande (${formatarTamanho(original.size)}). O limite é 2 MB — se possível, envie uma foto.`,
        );
      }
      return original;
    }
    if (!original.type.startsWith('image/')) {
      throw new ImagemInvalidaError('Envie uma foto ou um PDF.');
    }
    if (original.size > TAMANHO_MAXIMO_IMAGEM_ORIGINAL) {
      throw new ImagemInvalidaError(`Imagem muito grande (${formatarTamanho(original.size)}). O limite é 20 MB.`);
    }
    return comprimirImagem(original, { ladoMaximo: this.ladoMaximo(), qualidade: 0.8 });
  }
}
