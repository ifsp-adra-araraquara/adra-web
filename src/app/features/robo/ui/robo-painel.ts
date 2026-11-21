import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { Icon } from '../../../shared/components/icon/icon';
import { prenderTab } from '../../../shared/utils/foco.util';
import { NOME_ROBO } from '../nome';
import { Acao, Resposta } from '../respostas/resposta';
import { RoboConversa } from '../robo-conversa.service';
import { RoboMascote } from './robo-mascote';

interface Trecho {
  t: string;
  b: boolean;
}

/** "**negrito**" → trechos, sem innerHTML. */
function trechos(texto: string): Trecho[] {
  return texto.split('**').map((t, i) => ({ t, b: i % 2 === 1 })).filter((x) => x.t);
}

/** Abaixo disto a conversa ocupa a tela toda (celular, ou tela baixa deitada). */
const TELA_CHEIA = '(max-width: 599.98px), (max-height: 559.98px)';

/**
 * ADRAbot — a janela da conversa. Mobile first: no celular ocupa a tela
 * toda e acompanha o teclado virtual; do tablet para cima vira um painel
 * flutuante. Carregada só quando a pessoa abre o robô (@defer no botão).
 *
 * Teclado: Enter envia, Shift+Enter quebra a linha, Esc fecha, Tab fica
 * preso na janela. Leitor de tela: a conversa é um "log" (anuncia cada
 * mensagem nova) e o "buscando…" vai num status separado.
 */
@Component({
  selector: 'app-robo-painel',
  imports: [Icon, RoboMascote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'teclado($event)' },
  template: `
    <section
      #painel
      class="painel no-print"
      role="dialog"
      [attr.aria-modal]="telaCheia()"
      aria-labelledby="robo-titulo"
      aria-describedby="robo-descricao"
    >
      <header class="topo">
        <app-robo-mascote [tamanho]="40" [estado]="conversa.humor()" />
        <div class="titulo">
          <h2 id="robo-titulo">{{ nome }}</h2>
          <p id="robo-descricao">Assistente do Sistema ADRA · só consulta</p>
        </div>
        <button type="button" class="icone" (click)="recomecar()" aria-label="Recomeçar a conversa" title="Recomeçar">
          <app-icon name="rotate-ccw" [size]="18" />
        </button>
        <button type="button" class="icone" (click)="conversa.fechar()" [attr.aria-label]="'Fechar o ' + nome" title="Fechar (Esc)">
          <app-icon name="x" [size]="20" />
        </button>
      </header>

      <div #rolagem class="mensagens" role="log" [attr.aria-label]="'Conversa com o ' + nome" tabindex="0">
        @for (m of conversa.mensagens(); track m.id) {
          @if (m.autor === 'eu') {
            <p class="msg eu" [attr.data-msg]="m.id"><span class="sr-only">Você: </span>{{ m.texto }}</p>
          } @else if (m.resposta; as r) {
            <article class="msg robo" [attr.data-msg]="m.id" [attr.aria-label]="'Resposta do ' + nome">
              @for (p of r.texto; track $index) {
                <p class="principal">@for (x of trechos(p); track $index) { @if (x.b) { <strong>{{ x.t }}</strong> } @else { {{ x.t }} } }</p>
              }
              @if (r.barras?.length) {
                <ul class="barras">
                  @for (b of r.barras; track $index) {
                    <li class="barra" [class.destaque]="b.destaque">
                      <span class="rot">{{ b.rotulo }}</span>
                      <span class="trilho" aria-hidden="true"><i [style.width.%]="b.valor"></i></span>
                      <span class="val">{{ b.texto }}@if (b.destaque) {<span class="sr-only"> (destaque)</span>}</span>
                    </li>
                  }
                </ul>
              }
              @if (r.lista?.length) {
                <ul class="lista">
                  @for (item of r.lista; track $index) { <li>{{ item }}</li> }
                </ul>
              }
              @if (r.passos?.length) {
                <ol class="passos">
                  @for (p of r.passos; track $index) {
                    <li>@for (x of trechos(p); track $index) { @if (x.b) { <strong>{{ x.t }}</strong> } @else { {{ x.t }} } }</li>
                  }
                </ol>
              }
              @for (p of r.interpretacao ?? []; track $index) {
                <p class="interp">@for (x of trechos(p); track $index) { @if (x.b) { <strong>{{ x.t }}</strong> } @else { {{ x.t }} } }</p>
              }
              @if (r.criterio) {
                <p class="criterio"><span class="sr-only">Critério: </span>{{ r.criterio }}</p>
              }
              @if (r.menu?.length) {
                <div class="menu">
                  @for (g of r.menu; track g.titulo) {
                    <details>
                      <summary>{{ g.titulo }}</summary>
                      <div class="acoes">
                        @for (a of g.acoes; track $index) {
                          <button type="button" class="chip" (click)="agir(a, r)" [disabled]="conversa.pensando()">{{ a.rotulo }}</button>
                        }
                      </div>
                    </details>
                  }
                </div>
              }
              @if (r.acoes.length) {
                <div class="acoes" role="group" aria-label="Próximos passos">
                  @for (a of r.acoes; track $index) {
                    <button type="button" class="chip" [class.pdf]="a.tipo === 'pdf'" (click)="agir(a, r)" [disabled]="conversa.pensando()">
                      @if (a.tipo === 'pdf') { <app-icon name="file-text" [size]="15" /> }
                      @if (a.tipo === 'navegar') { <app-icon name="chevron-right" [size]="15" /> }
                      {{ a.rotulo }}
                    </button>
                  }
                </div>
              }
            </article>
          }
        }
        @if (conversa.pensando()) {
          <p class="msg robo digitando" aria-hidden="true"><span></span><span></span><span></span></p>
        }
      </div>
      <p class="sr-only" role="status">{{ conversa.pensando() ? 'Buscando os números…' : '' }}</p>

      <form class="campo" (submit)="enviar($event)">
        <label for="robo-pergunta" class="sr-only">Pergunta para o {{ nome }}</label>
        <textarea
          #campo
          id="robo-pergunta"
          rows="1"
          maxlength="300"
          autocomplete="off"
          enterkeyhint="send"
          aria-describedby="robo-dica"
          placeholder="Pergunte sobre frequência, atendidos, grupos…"
          [value]="texto()"
          (input)="digitar($event)"
          (keydown)="teclaNoCampo($event)"
        ></textarea>
        <button type="submit" class="enviar" [disabled]="!texto().trim() || conversa.pensando()" aria-label="Enviar pergunta">
          <app-icon name="chevron-right" [size]="22" />
        </button>
        <p id="robo-dica" class="dica">Enter envia · Shift+Enter quebra a linha</p>
      </form>
    </section>
  `,
  styles: `
    /* ===== Base: celular (mobile first) ===== */
    .painel {
      position: fixed; z-index: 190; inset: 0 0 auto 0;
      height: var(--robo-altura, 100dvh);
      display: flex; flex-direction: column; overflow: hidden;
      background: #fff; color: var(--gray-800);
      animation: subir .18s ease-out;
    }
    .topo {
      display: flex; align-items: center; gap: 8px; flex: none;
      padding: calc(8px + env(safe-area-inset-top, 0px)) max(8px, env(safe-area-inset-right, 0px)) 8px max(12px, env(safe-area-inset-left, 0px));
      background: var(--color-brand); color: #fff;
    }
    .titulo { flex: 1; min-width: 0; }
    .titulo h2 { margin: 0; font-size: 17px; font-weight: 800; line-height: 1.2; color: #fff; }
    .titulo p { margin: 0; font-size: 12px; line-height: 1.3; color: #fff; opacity: .9; }
    .icone {
      display: grid; place-items: center; flex: none; width: 44px; height: 44px;
      border-radius: 50%; border: none; background: transparent; color: #fff; cursor: pointer;
    }
    .icone:hover { background: color-mix(in srgb, #fff 16%, transparent); }
    .icone:focus-visible { outline: 3px solid #fff; outline-offset: -3px; }

    .mensagens {
      flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
      display: flex; flex-direction: column; gap: 12px;
      padding: 14px max(12px, env(safe-area-inset-right, 0px)) 16px max(12px, env(safe-area-inset-left, 0px));
      background: var(--gray-50);
    }
    .mensagens:focus-visible { outline: 3px solid var(--color-brand-ring); outline-offset: -3px; }
    .msg { margin: 0; max-width: min(100%, 34rem); padding: 10px 12px; border-radius: 16px; font-size: 15px; line-height: 1.5; overflow-wrap: anywhere; animation: aparecer .2s ease-out; }
    .msg.eu { align-self: flex-end; max-width: 85%; background: var(--color-brand); color: #fff; border-bottom-right-radius: 4px; white-space: pre-wrap; }
    .msg.robo { align-self: stretch; background: #fff; border: 1px solid var(--gray-200); border-bottom-left-radius: 4px; display: flex; flex-direction: column; gap: 10px; }
    .msg.robo p { margin: 0; }
    .principal strong { color: var(--color-brand-active); }
    .interp { color: var(--gray-600); font-size: 14px; }
    .criterio { color: var(--gray-600); font-size: 12px; border-top: 1px dashed var(--gray-200); padding-top: 8px; }

    .barras, .lista, .passos { margin: 0; }
    .barras { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; font-variant-numeric: tabular-nums; }
    .barra { display: grid; grid-template-columns: minmax(0, 9em) minmax(40px, 1fr) auto; gap: 8px; align-items: center; }
    .rot { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .trilho { height: 10px; border-radius: 5px; background: var(--gray-100); overflow: hidden; }
    .trilho i { display: block; height: 100%; min-width: 2px; border-radius: 5px; background: var(--color-brand); }
    .barra.destaque .trilho i { background: #C2553B; }
    .barra.destaque .val { font-weight: 700; }
    .val { text-align: right; white-space: nowrap; }
    .lista, .passos { padding-left: 22px; display: flex; flex-direction: column; gap: 4px; font-size: 14px; }

    .menu { display: flex; flex-direction: column; gap: 2px; }
    .menu details { border-top: 1px solid var(--gray-100); }
    .menu summary { cursor: pointer; font-weight: 700; font-size: 14px; padding: 10px 2px; min-height: 44px; box-sizing: border-box; color: var(--color-brand-active); }
    .menu summary:focus-visible { outline: 3px solid var(--color-brand-ring); outline-offset: 2px; border-radius: 6px; }
    .menu .acoes { padding-bottom: 10px; }
    .acoes { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 14px;
      border-radius: 22px; cursor: pointer; text-align: left;
      font: 600 14px/1.25 inherit; border: 1.5px solid var(--color-brand); background: #fff; color: var(--color-brand-active);
      touch-action: manipulation;
    }
    .chip:hover:not(:disabled) { background: var(--color-brand-soft); }
    .chip.pdf { background: var(--color-brand); color: #fff; }
    .chip.pdf:hover:not(:disabled) { background: var(--color-brand-hover); }
    .chip:disabled { opacity: .5; cursor: default; }
    .chip:focus-visible, .enviar:focus-visible { outline: 3px solid var(--color-brand-ring); outline-offset: 2px; }

    .digitando { display: inline-flex; gap: 5px; align-self: flex-start; padding: 14px 16px; }
    .digitando span { width: 8px; height: 8px; border-radius: 50%; background: var(--color-brand); animation: ponto 1s infinite ease-in-out; }
    .digitando span:nth-child(2) { animation-delay: .15s; }
    .digitando span:nth-child(3) { animation-delay: .3s; }

    .campo {
      flex: none; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 8px;
      padding: 10px max(12px, env(safe-area-inset-right, 0px)) calc(10px + env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
      border-top: 1px solid var(--gray-200); background: #fff;
    }
    textarea {
      box-sizing: border-box; width: 100%; min-height: 46px; max-height: calc(1.4em * 5 + 22px); /* até 5 linhas */
      padding: 11px 16px; resize: none; overflow-y: auto;
      font: 16px/1.4 inherit; /* 16px: o iOS não dá zoom ao focar */
      border-radius: 23px; border: 1.5px solid var(--gray-200); background: #fff; color: var(--gray-800);
    }
    textarea:focus { outline: none; border-color: var(--color-brand); box-shadow: 0 0 0 3px var(--color-brand-soft); }
    .enviar { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; border: none; background: var(--color-brand); color: #fff; cursor: pointer; touch-action: manipulation; }
    .enviar:disabled { opacity: .4; cursor: default; }
    .dica { display: none; grid-column: 1 / -1; margin: 0 4px; font-size: 11.5px; color: var(--gray-600); }

    /* ===== Tablet e computador: painel flutuante ===== */
    @media (min-width: 600px) and (min-height: 560px) {
      .painel {
        inset: auto calc(20px + env(safe-area-inset-right, 0px)) 100px auto;
        width: min(420px, calc(100vw - 40px)); height: min(680px, calc(100dvh - 124px));
        border: 1px solid var(--gray-200); border-radius: 18px; box-shadow: var(--shadow-lg);
      }
      .topo { padding: 10px 8px 10px 14px; }
      .mensagens, .campo { padding-left: 14px; padding-right: 14px; }
      .campo { padding-bottom: 10px; }
    }
    @media (min-width: 1440px) and (min-height: 760px) {
      .painel { width: 460px; height: min(740px, calc(100dvh - 124px)); }
    }
    /* Teclado físico (mouse): mostra o atalho; botões podem ser um pouco menores. */
    @media (hover: hover) and (pointer: fine) {
      .dica { display: block; }
      .chip { min-height: 36px; padding: 7px 13px; font-size: 13.5px; }
      .icone { width: 38px; height: 38px; }
    }

    /* Alto contraste do Windows: bordas visíveis no lugar das cores. */
    @media (forced-colors: active) {
      .painel, .msg, .chip, textarea, .enviar { border: 1px solid CanvasText; }
      .trilho i { background: Highlight; forced-color-adjust: none; }
    }

    @keyframes subir { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    @keyframes aparecer { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    @keyframes ponto { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
    @media (prefers-reduced-motion: reduce) {
      .painel, .msg, .digitando span { animation: none; }
    }
  `,
})
export class RoboPainel {
  protected readonly conversa = inject(RoboConversa);
  protected readonly nome = NOME_ROBO;
  protected readonly trechos = trechos;
  protected readonly texto = signal('');
  protected readonly telaCheia = signal(false);

  private readonly document = inject(DOCUMENT);
  private readonly painel = viewChild.required<ElementRef<HTMLElement>>('painel');
  private readonly rolagem = viewChild.required<ElementRef<HTMLElement>>('rolagem');
  private readonly campo = viewChild.required<ElementRef<HTMLTextAreaElement>>('campo');

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      this.acompanharTela(destroy);
      // No celular, não abre o teclado sozinho por cima da resposta: o foco vai para a janela.
      if (this.telaCheia()) this.painel().nativeElement.focus({ preventScroll: true });
      else this.campo().nativeElement.focus();
      this.rolarPara('fim');
    });

    // Mensagem nova: a do robô aparece do começo (respostas longas), a minha rola até o fim.
    let ultimaVista = 0;
    effect(() => {
      const lista = this.conversa.mensagens();
      this.conversa.pensando();
      untracked(() => {
        const ultima = lista[lista.length - 1];
        const nova = ultima && ultima.id !== ultimaVista;
        ultimaVista = ultima?.id ?? 0;
        setTimeout(() => this.rolarPara(nova && ultima.autor === 'robo' && lista.length > 1 ? ultima.id : 'fim'));
      });
    });
  }

  protected digitar(evento: Event): void {
    const campo = evento.target as HTMLTextAreaElement;
    this.texto.set(campo.value);
    this.ajustarAltura(campo);
  }

  /** Enter envia; Shift+Enter quebra a linha; durante a composição (acento, teclado asiático) não envia. */
  protected teclaNoCampo(evento: KeyboardEvent): void {
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.isComposing && evento.keyCode !== 229) {
      evento.preventDefault();
      this.enviar();
    }
  }

  protected enviar(evento?: Event): void {
    evento?.preventDefault();
    const texto = this.texto().trim();
    if (!texto || this.conversa.pensando()) return;
    this.texto.set('');
    const campo = this.campo().nativeElement;
    campo.value = '';
    this.ajustarAltura(campo);
    void this.conversa.enviar(texto);
    campo.focus();
  }

  protected agir(acao: Acao, origem: Resposta): void {
    void this.conversa.agir(acao, origem);
  }

  protected recomecar(): void {
    void this.conversa.recomecar();
    this.campo().nativeElement.focus();
  }

  protected teclado(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      this.conversa.fechar();
    } else if (evento.key === 'Tab') {
      prenderTab(evento, this.painel().nativeElement);
    }
  }

  private ajustarAltura(campo: HTMLTextAreaElement): void {
    campo.style.height = 'auto';
    campo.style.height = `${campo.scrollHeight}px`;
  }

  private rolarPara(alvo: number | 'fim'): void {
    const caixa = this.rolagem().nativeElement;
    if (alvo === 'fim') {
      caixa.scrollTop = caixa.scrollHeight;
      return;
    }
    const msg = caixa.querySelector<HTMLElement>(`[data-msg="${alvo}"]`);
    if (msg) caixa.scrollTop = Math.max(0, msg.offsetTop - caixa.offsetTop - 8);
  }

  /**
   * Tela cheia no celular e altura acompanhando o teclado virtual
   * (visualViewport): o campo de digitar nunca fica escondido atrás do teclado.
   */
  private acompanharTela(destroy: DestroyRef): void {
    const janela = this.document.defaultView;
    if (!janela) return;
    const consulta = janela.matchMedia(TELA_CHEIA);
    const painel = this.painel().nativeElement;
    painel.tabIndex = -1;
    const atualizar = () => {
      this.telaCheia.set(consulta.matches);
      const vv = janela.visualViewport;
      if (consulta.matches && vv) {
        painel.style.setProperty('--robo-altura', `${vv.height}px`);
        painel.style.transform = `translateY(${vv.offsetTop}px)`;
      } else {
        painel.style.removeProperty('--robo-altura');
        painel.style.transform = '';
      }
    };
    atualizar();
    consulta.addEventListener('change', atualizar);
    janela.visualViewport?.addEventListener('resize', atualizar);
    janela.visualViewport?.addEventListener('scroll', atualizar);
    destroy.onDestroy(() => {
      consulta.removeEventListener('change', atualizar);
      janela.visualViewport?.removeEventListener('resize', atualizar);
      janela.visualViewport?.removeEventListener('scroll', atualizar);
    });
  }
}
