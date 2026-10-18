import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ArquivoService } from '../../../core/arquivo.service';
import { EntidadeArquivo } from '../../enum/EntidadeArquivo';
import { Modal } from '../modal/modal';

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * Foto de perfil redonda com fallback para as iniciais do nome.
 * Busca a URL assinada sob demanda (com cache no ArquivoService).
 *
 * Uso:
 *   <app-avatar [entidadeId]="assistido.assistidoId" [nome]="assistido.nomeCompleto" [size]="40" />
 *   Clicável para ver a foto em tamanho grande (ficha):
 *   <app-avatar [entidadeId]="id" [nome]="nome" [size]="72" [ampliavel]="true" />
 */
@Component({
  selector: 'app-avatar',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
  host: {
    '[style.--avatar-size]': "size() + 'px'",
  },
})
export class Avatar {
  private readonly arquivoService = inject(ArquivoService);

  entidadeId = input.required<number>();
  nome = input('');
  entidadeTipo = input<EntidadeArquivo>(EntidadeArquivo.ASSISTIDO);
  size = input(40);
  /** Clique na foto abre a imagem grande num modal (só quando há foto). */
  ampliavel = input(false);

  protected readonly ampliada = signal(false);

  protected readonly url = signal<string | null>(null);
  private tentouRecarregar = false;

  /** Primeiro e último nome, ignorando "de", "da", "dos"... — "Ana Maria da Silva" → "AS". */
  protected readonly iniciais = computed(() => {
    const partes = this.nome()
      .trim()
      .split(/\s+/)
      .filter((p) => p && !PARTICULAS.has(p.toLowerCase()));
    if (partes.length === 0) return '?';
    const primeira = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  });

  /** Dono exibido no momento — ao trocar de dono limpa a imagem; ao só rever (revisaoFotos), não pisca. */
  private chaveAtual = '';

  constructor() {
    effect((onCleanup) => {
      const tipo = this.entidadeTipo();
      const id = this.entidadeId();
      this.arquivoService.revisaoFotos(); // rebusca quando alguma foto é trocada
      let ativo = true;
      onCleanup(() => (ativo = false));

      const chave = `${tipo}:${id}`;
      if (chave !== this.chaveAtual) {
        this.chaveAtual = chave;
        this.url.set(null);
        this.tentouRecarregar = false;
      }
      this.arquivoService.fotoPerfilUrl(tipo, id).then((url) => {
        if (ativo) this.url.set(url);
      });
    });
  }

  /** URL assinada expirou com a tela aberta: busca uma nova uma vez; se falhar de novo, fica nas iniciais. */
  protected aoFalharImagem(): void {
    this.url.set(null);
    if (this.tentouRecarregar) return;
    this.tentouRecarregar = true;

    const tipo = this.entidadeTipo();
    const id = this.entidadeId();
    this.arquivoService.invalidarFotoPerfil(tipo, id, false);
    this.arquivoService.fotoPerfilUrl(tipo, id).then((url) => {
      if (id === this.entidadeId()) this.url.set(url);
    });
  }
}
