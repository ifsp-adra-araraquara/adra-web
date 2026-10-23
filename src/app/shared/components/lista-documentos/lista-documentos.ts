import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { ArquivoService } from '../../../core/arquivo.service';
import { CategoriaArquivo } from '../../enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../enum/EntidadeArquivo';
import { ArquivoResponseDTO } from '../../models/arquivo/ArquivoResponseDTO';
import { Icon } from '../icon/icon';
import { Modal } from '../modal/modal';

interface DocumentoExibido {
  arquivo: ArquivoResponseDTO;
  url: string | null;
  expiraEm: number;
  ehImagem: boolean;
}

/**
 * Mostra os arquivos de uma categoria (ex.: RG/CPF do assistido) como miniaturas.
 * Tocar numa imagem abre um modal com ela ampliada; PDF abre em nova aba.
 * URLs são temporárias e geradas na hora.
 *
 * Uso:
 *   <app-lista-documentos [entidadeId]="id" [categoria]="CategoriaArquivo.DOCUMENTO_IDENTIDADE" />
 */
@Component({
  selector: 'app-lista-documentos',
  imports: [Icon, Modal],
  templateUrl: './lista-documentos.html',
  styleUrl: './lista-documentos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaDocumentos {
  private readonly arquivoService = inject(ArquivoService);

  entidadeId = input.required<number>();
  categoria = input.required<CategoriaArquivo>();
  entidadeTipo = input<EntidadeArquivo>(EntidadeArquivo.ASSISTIDO);
  /** Nome usado nos textos alternativos (ex.: "RG ou CPF"). */
  rotulo = input('Documento');
  vazio = input('Nenhum documento enviado.');

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly documentos = signal<DocumentoExibido[]>([]);
  /** Imagem aberta no modal de visualização (null = fechado). */
  protected readonly ampliado = signal<{ url: string; titulo: string } | null>(null);
  protected readonly modalAberto = signal(false);

  constructor() {
    effect((onCleanup) => {
      const tipo = this.entidadeTipo();
      const id = this.entidadeId();
      const categoria = this.categoria();
      this.arquivoService.revisaoArquivos(); // recarrega quando algo é enviado/removido
      let ativo = true;
      onCleanup(() => (ativo = false));

      this.carregando.set(true);
      this.erro.set(null);
      this.carregar(tipo, id, categoria)
        .then((docs) => ativo && this.documentos.set(docs))
        .catch(() => ativo && this.erro.set('Não foi possível carregar os documentos.'))
        .finally(() => ativo && this.carregando.set(false));
    });
  }

  /** Imagem: abre o modal ampliado (renovando a URL se expirou). */
  protected async ampliar(doc: DocumentoExibido, indice: number): Promise<void> {
    try {
      if (!doc.url || doc.expiraEm <= Date.now()) {
        const { url, expiraEm } = await this.arquivoService.gerarUrl(doc.arquivo.arquivoId);
        doc.url = url;
        doc.expiraEm = new Date(expiraEm).getTime() - 30_000;
      }
      this.ampliado.set({ url: doc.url!, titulo: `${this.rotulo()} ${indice + 1}` });
      this.modalAberto.set(true);
    } catch {
      this.erro.set('Não foi possível abrir o documento.');
    }
  }

  /** PDF — URL expirada (tela aberta há muito tempo): gera outra antes de abrir. */
  protected async abrir(evento: MouseEvent, doc: DocumentoExibido): Promise<void> {
    if (doc.url && doc.expiraEm > Date.now()) return; // segue o link normal
    evento.preventDefault();
    // Abre a aba já no clique (senão o bloqueador de pop-up barra) e só depois aponta pra URL nova.
    const novaJanela = window.open('', '_blank');
    if (novaJanela) novaJanela.opener = null;
    try {
      const { url, expiraEm } = await this.arquivoService.gerarUrl(doc.arquivo.arquivoId);
      doc.url = url;
      doc.expiraEm = new Date(expiraEm).getTime() - 30_000;
      if (novaJanela) novaJanela.location.href = url;
    } catch {
      novaJanela?.close();
      this.erro.set('Não foi possível abrir o documento.');
    }
  }

  private async carregar(tipo: EntidadeArquivo, id: number, categoria: CategoriaArquivo): Promise<DocumentoExibido[]> {
    const arquivos = await this.arquivoService.listar(tipo, id, categoria);
    return Promise.all(
      arquivos.map(async (arquivo) => {
        const { url, expiraEm } = await this.arquivoService.gerarUrl(arquivo.arquivoId);
        return {
          arquivo,
          url,
          expiraEm: new Date(expiraEm).getTime() - 30_000,
          ehImagem: arquivo.mimeType.startsWith('image/'),
        };
      }),
    );
  }
}
