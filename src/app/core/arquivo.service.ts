import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoriaArquivo } from '../shared/enum/CategoriaArquivo';
import { EntidadeArquivo } from '../shared/enum/EntidadeArquivo';
import { ArquivoResponseDTO } from '../shared/models/arquivo/ArquivoResponseDTO';
import { UrlArquivoDTO } from '../shared/models/arquivo/UrlArquivoDTO';

/** Margem para não entregar uma URL assinada que expira enquanto a imagem carrega. */
const MARGEM_EXPIRACAO_MS = 30_000;
/** "Não tem foto" também fica em cache, pra não perguntar de novo a cada render. */
const VALIDADE_SEM_FOTO_MS = 5 * 60_000;
const MAXIMO_FOTOS_POR_LOTE = 100;

interface EntradaCache {
  url: string | null;
  expiraEm: number;
}

interface PedidoDeFoto {
  entidadeId: number;
  resolver: (entrada: EntradaCache) => void;
  rejeitar: (erro: unknown) => void;
}

function entradaDaFoto(foto: UrlArquivoDTO | undefined): EntradaCache {
  return foto
    ? { url: foto.url, expiraEm: new Date(foto.expiraEm).getTime() - MARGEM_EXPIRACAO_MS }
    : { url: null, expiraEm: Date.now() + VALIDADE_SEM_FOTO_MS };
}

@Injectable({ providedIn: 'root' })
export class ArquivoService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/arquivos`;

  private readonly cache = new Map<string, EntradaCache>();
  /**
   * Muda quando uma foto é trocada — os <app-avatar> já na tela dependem dele
   * e rebuscam (o que não mudou sai do cache, sem requisição).
   */
  readonly revisaoFotos = signal(0);
  /** Muda a cada envio/remoção — listas de documentos na tela recarregam. */
  readonly revisaoArquivos = signal(0);
  /** Requisições em andamento — vários avatares do mesmo dono compartilham a mesma busca. */
  private readonly emAndamento = new Map<string, Promise<string | null>>();
  private readonly filaDeFotos = new Map<EntidadeArquivo, PedidoDeFoto[]>();

  listar(entidadeTipo: EntidadeArquivo, entidadeId: number, categoria?: CategoriaArquivo): Promise<ArquivoResponseDTO[]> {
    let params = new HttpParams().set('entidadeTipo', entidadeTipo).set('entidadeId', entidadeId);
    if (categoria) params = params.set('categoria', categoria);
    return firstValueFrom(this.http.get<ArquivoResponseDTO[]>(this.api, { params }));
  }

  /** POST /api/arquivos (multipart). Para FOTO_PERFIL o back substitui a foto anterior. */
  enviar(
    entidadeTipo: EntidadeArquivo,
    entidadeId: number,
    categoria: CategoriaArquivo,
    arquivo: File,
  ): Promise<ArquivoResponseDTO> {
    const params = new HttpParams()
      .set('entidadeTipo', entidadeTipo)
      .set('entidadeId', entidadeId)
      .set('categoria', categoria);
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    return firstValueFrom(this.http.post<ArquivoResponseDTO>(this.api, formData, { params })).then((salvo) => {
      this.revisaoArquivos.update((v) => v + 1);
      return salvo;
    });
  }

  /** DELETE /api/arquivos/{id} — some na hora; o back apaga do storage após o commit. */
  remover(arquivoId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/${arquivoId}`)).then(() => {
      this.revisaoArquivos.update((v) => v + 1);
    });
  }

  gerarUrl(arquivoId: number): Promise<UrlArquivoDTO> {
    return firstValueFrom(this.http.get<UrlArquivoDTO>(`${this.api}/${arquivoId}/url`));
  }

  /**
   * URL temporária da foto de perfil, ou null se não houver (ou se o perfil
   * logado não puder ver arquivos — ex.: oficineiro recebe 403 e cai nas iniciais).
   */
  fotoPerfilUrl(entidadeTipo: EntidadeArquivo, entidadeId: number): Promise<string | null> {
    const chave = `${entidadeTipo}:${entidadeId}`;

    const emCache = this.cache.get(chave);
    if (emCache && emCache.expiraEm > Date.now()) {
      return Promise.resolve(emCache.url);
    }

    const pendente = this.emAndamento.get(chave);
    if (pendente) return pendente;

    const busca = this.buscarFotoPerfil(entidadeTipo, entidadeId)
      .catch((): EntradaCache => ({ url: null, expiraEm: Date.now() + VALIDADE_SEM_FOTO_MS })) // sem foto visível não é erro de tela
      .then((resultado) => {
        this.cache.set(chave, resultado);
        return resultado.url;
      })
      .finally(() => this.emAndamento.delete(chave));

    this.emAndamento.set(chave, busca);
    return busca;
  }

  /**
   * Força buscar de novo. `notificar` avisa os avatares na tela (use depois de
   * trocar a foto); sem notificar, só limpa o cache (ex.: URL expirada).
   */
  invalidarFotoPerfil(entidadeTipo: EntidadeArquivo, entidadeId: number, notificar = true): void {
    this.cache.delete(`${entidadeTipo}:${entidadeId}`);
    if (notificar) this.revisaoFotos.update((v) => v + 1);
  }

  private buscarFotoPerfil(entidadeTipo: EntidadeArquivo, entidadeId: number): Promise<EntradaCache> {
    return new Promise((resolver, rejeitar) => {
      if (this.filaDeFotos.size === 0) setTimeout(() => this.enviarFilaDeFotos());
      const pedidos = this.filaDeFotos.get(entidadeTipo) ?? [];
      this.filaDeFotos.set(entidadeTipo, [...pedidos, { entidadeId, resolver, rejeitar }]);
    });
  }

  private enviarFilaDeFotos(): void {
    const fila = [...this.filaDeFotos];
    this.filaDeFotos.clear();
    for (const [entidadeTipo, pedidos] of fila) {
      for (let inicio = 0; inicio < pedidos.length; inicio += MAXIMO_FOTOS_POR_LOTE) {
        this.buscarLoteDeFotos(entidadeTipo, pedidos.slice(inicio, inicio + MAXIMO_FOTOS_POR_LOTE));
      }
    }
  }

  private buscarLoteDeFotos(entidadeTipo: EntidadeArquivo, pedidos: PedidoDeFoto[]): void {
    const params = new HttpParams()
      .set('entidadeTipo', entidadeTipo)
      .set('entidadeIds', pedidos.map((pedido) => pedido.entidadeId).join(','));
    firstValueFrom(this.http.get<Record<number, UrlArquivoDTO>>(`${this.api}/fotos-perfil`, { params })).then(
      (fotos) => pedidos.forEach((pedido) => pedido.resolver(entradaDaFoto(fotos[pedido.entidadeId]))),
      (erro) => pedidos.forEach((pedido) => pedido.rejeitar(erro)),
    );
  }
}
