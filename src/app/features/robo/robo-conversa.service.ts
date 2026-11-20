import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { Role } from '../../shared/enum/role.enum';
import { RoboDados } from './dados/robo-dados.service';
import type { ContextoConversa, Entidades, Intencao, Lacunas } from './motor/tipos';
import type { Acao, Humor, Relatorio, Resposta } from './respostas/resposta';

type Nucleo = typeof import('./robo-nucleo');
let nucleoPedido: Promise<Nucleo> | null = null;
/** Motor, catálogo e respostas: baixados só na primeira abertura do robô. */
function nucleo(): Promise<Nucleo> {
  nucleoPedido ??= import('./robo-nucleo').catch((erro) => {
    nucleoPedido = null;
    throw erro;
  });
  return nucleoPedido;
}

export interface Mensagem {
  id: number;
  autor: 'eu' | 'robo';
  texto?: string;
  resposta?: Resposta;
}

/** O relatório aberto na folha A4 (/robo/relatorio). Só em memória: recarregou, sumiu. */
export interface RelatorioAberto extends Relatorio {
  geradoPor: string;
  geradoEm: Date;
}

const CHAVE = 'adra.robo.conversa';
const MAXIMO_GUARDADO = 40;
const VAZIAS: Entidades = { grupos: [], oficinas: [] };

/**
 * ADRAbot — estado da conversa. A conversa fica só nesta aba
 * (sessionStorage) e é apagada ao sair do sistema.
 */
@Injectable({ providedIn: 'root' })
export class RoboConversa {
  private readonly auth = inject(AuthService);
  private readonly dados = inject(RoboDados);
  private readonly router = inject(Router);

  readonly aberto = signal(false);
  readonly mensagens = signal<Mensagem[]>([]);
  readonly pensando = signal(false);
  readonly humor = signal<Humor | 'pensando' | 'parado'>('parado');
  readonly relatorio = signal<RelatorioAberto | null>(null);

  private contexto: ContextoConversa = { falhasSeguidas: 0 };
  private entidades: Entidades | null = null;
  private proximoId = 1;
  private dono: number | null = null;
  private origem: HTMLElement | null = null;

  constructor() {
    // Saiu do sistema: fecha o robô e esquece a conversa e o cache também da memória.
    effect(() => {
      if (this.auth.currentUserResponse()) return;
      untracked(() => {
        this.aberto.set(false);
        this.mensagens.set([]);
        this.relatorio.set(null);
        this.contexto = { falhasSeguidas: 0 };
        this.entidades = null;
        this.dono = null;
        this.dados.limpar();
      });
    });
  }

  /** @param origem quem abriu (botão flutuante ou atalho do topo): recebe o foco de volta ao fechar. */
  async abrir(origem?: HTMLElement | null): Promise<void> {
    this.origem = origem ?? null;
    this.aberto.set(true);
    this.garantirDono();
    if (!this.mensagens().length) this.restaurar();
    void this.carregarEntidades();
    if (!this.mensagens().length) {
      const n = await nucleo();
      if (!this.mensagens().length) this.falar(n.boasVindas(this.perfil(), this.primeiroNome()));
    }
  }

  fechar(): void {
    this.aberto.set(false);
  }

  /** Foco de volta para quem abriu, se ainda estiver visível; senão, para o substituto. */
  devolverFoco(substituto?: HTMLElement | null): void {
    const alvo = this.origem?.isConnected && this.origem.getClientRects().length ? this.origem : substituto;
    alvo?.focus({ preventScroll: true });
    this.origem = null;
  }

  /** Conversa nova e números novos (esquece o cache do robô). */
  async recomecar(): Promise<void> {
    this.mensagens.set([]);
    this.contexto = { falhasSeguidas: 0 };
    this.entidades = null;
    this.dados.limpar();
    sessionStorage.removeItem(CHAVE);
    const n = await nucleo();
    this.falar(n.boasVindas(this.perfil(), this.primeiroNome()));
  }

  async enviar(texto: string): Promise<void> {
    const limpo = texto.trim().slice(0, 300);
    if (!limpo || this.pensando()) return;
    this.adicionar({ autor: 'eu', texto: limpo });
    await this.responder(async () => {
      const [n, entidades] = await Promise.all([nucleo(), this.carregarEntidades()]);
      const { decisao } = n.entender({ texto: limpo, perfil: this.perfil(), hoje: new Date(), entidades, contexto: this.contexto });
      switch (decisao.tipo) {
        case 'executar':
          return this.executar(decisao.intencao, decisao.lacunas);
        case 'sugerir':
          this.contexto.falhasSeguidas = 0;
          return n.respostaSugestao(decisao.opcoes, decisao.lacunas);
        case 'sem-permissao':
          return n.respostaSemPermissao(decisao.intencao, this.perfil());
        case 'fora': {
          const resposta = n.respostaFora(decisao.categoria, this.perfil(), this.contexto.falhasSeguidas, decisao.ajuda);
          const falhou = decisao.categoria === 'alheio' || decisao.categoria === 'nao-entendi';
          this.contexto.falhasSeguidas = falhou ? this.contexto.falhasSeguidas + 1 : 0;
          return resposta;
        }
      }
    });
  }

  async agir(acao: Acao, origem?: Resposta): Promise<void> {
    if (this.pensando()) return;
    switch (acao.tipo) {
      case 'perguntar':
        return this.enviar(acao.texto);
      case 'executar': {
        const intencao = (await nucleo()).intencaoPorId(acao.intencaoId);
        if (!intencao) return;
        this.adicionar({ autor: 'eu', texto: acao.rotulo });
        const lacunas: Lacunas = acao.lacunas ?? { periodos: [], comparar: false };
        await this.responder(() => this.executar(intencao, lacunas));
        return;
      }
      case 'menu':
        this.adicionar({ autor: 'eu', texto: acao.rotulo });
        this.falar((await nucleo()).respostaMenu(this.perfil()));
        return;
      case 'navegar':
        this.fechar();
        await this.router.navigate([acao.rota], { queryParams: acao.query });
        return;
      case 'pdf':
        if (origem?.relatorio) await this.abrirRelatorio(origem.relatorio);
        return;
    }
  }

  async abrirRelatorio(relatorio: Relatorio): Promise<void> {
    const usuario = this.auth.currentUserResponse();
    const n = await nucleo();
    this.relatorio.set({
      ...relatorio,
      geradoPor: `${usuario?.nomeCompleto ?? 'Usuário'} (${n.nomeDoPerfil(this.perfil())})`,
      geradoEm: new Date(),
    });
    this.fechar();
    void this.router.navigate(['/robo/relatorio']);
  }

  /* ---------------- internos ---------------- */

  private async executar(intencao: Intencao, lacunas: Lacunas): Promise<Resposta> {
    const perfil = this.perfil();
    const [n, entidades] = await Promise.all([nucleo(), this.carregarEntidades()]);
    if (!intencao.perfis.includes(perfil)) return n.respostaSemPermissao(intencao, perfil);
    try {
      const resposta = await n.executorPara(intencao)({ lacunas, perfil, hoje: new Date(), dados: this.dados, entidades });
      this.contexto = { falhasSeguidas: 0, ultima: { intencao, lacunas } };
      return resposta;
    } catch (erro) {
      if (erro instanceof HttpErrorResponse && erro.status === 403) return n.respostaSemPermissao(intencao, perfil);
      return {
        texto: ['Não consegui buscar os dados agora. Confira a conexão e tente de novo.'],
        acoes: [
          { tipo: 'executar', rotulo: 'Tentar de novo', intencaoId: intencao.id, lacunas },
          { tipo: 'menu', rotulo: 'Outra pergunta' },
        ],
        humor: 'confuso',
      };
    }
  }

  private async responder(gerar: () => Promise<Resposta>): Promise<void> {
    this.pensando.set(true);
    this.humor.set('pensando');
    try {
      this.falar(await gerar());
    } finally {
      this.pensando.set(false);
    }
  }

  private falar(resposta: Resposta): void {
    this.adicionar({ autor: 'robo', resposta });
    this.humor.set(resposta.humor ?? 'falando');
    setTimeout(() => this.humor.set('parado'), 1600);
  }

  private adicionar(m: Omit<Mensagem, 'id'>): void {
    this.mensagens.update((lista) => [...lista, { ...m, id: this.proximoId++ }].slice(-MAXIMO_GUARDADO));
    this.guardar();
  }

  private async carregarEntidades(): Promise<Entidades> {
    if (this.entidades) return this.entidades;
    try {
      this.entidades = await this.dados.entidades();
    } catch {
      return VAZIAS; // sem a lista, o robô ainda responde (só não reconhece nomes de grupo)
    }
    return this.entidades;
  }

  private perfil(): Role {
    return this.auth.currentProfile() ?? Role.EDUCADOR;
  }

  private primeiroNome(): string {
    return (this.auth.currentUserResponse()?.nomeCompleto ?? '').split(' ')[0] ?? '';
  }

  /** Outra pessoa entrou na mesma aba: começa do zero. */
  private garantirDono(): void {
    const id = this.auth.currentUserResponse()?.usuarioId ?? null;
    if (id !== this.dono) {
      this.dono = id;
      this.mensagens.set([]);
      this.contexto = { falhasSeguidas: 0 };
      this.entidades = null;
      this.dados.limpar();
    }
  }

  private guardar(): void {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify({ dono: this.dono, mensagens: this.mensagens() }));
    } catch {
      /* sem armazenamento: a conversa só não sobrevive ao recarregar */
    }
  }

  private restaurar(): void {
    try {
      const salvo = JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null') as { dono: number | null; mensagens: Mensagem[] } | null;
      if (salvo && salvo.dono === this.dono && Array.isArray(salvo.mensagens)) {
        this.mensagens.set(salvo.mensagens);
        this.proximoId = Math.max(0, ...salvo.mensagens.map((m) => m.id)) + 1;
      }
    } catch {
      /* ignora conversa corrompida */
    }
  }
}
