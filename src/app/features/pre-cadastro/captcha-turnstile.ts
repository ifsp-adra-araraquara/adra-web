import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, output, signal, viewChild } from '@angular/core';

import { environment } from '../../../environments/environment';

const FUNCAO_AO_CARREGAR = 'aoCarregarTurnstile';
const URL_SCRIPT = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${FUNCAO_AO_CARREGAR}`;

interface Turnstile {
  render(alvo: HTMLElement, opcoes: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

type JanelaComTurnstile = Window & { turnstile?: Turnstile; [FUNCAO_AO_CARREGAR]?: () => void };

let carregamento: Promise<Turnstile> | null = null;

function carregarTurnstile(documento: Document): Promise<Turnstile> {
  carregamento ??= new Promise((resolver, rejeitar) => {
    const janela = documento.defaultView as JanelaComTurnstile;
    janela[FUNCAO_AO_CARREGAR] = () => resolver(janela.turnstile!);
    const script = documento.createElement('script');
    script.src = URL_SCRIPT;
    script.onerror = () => {
      carregamento = null;
      rejeitar(new Error('Turnstile indisponível.'));
    };
    documento.head.append(script);
  });
  return carregamento;
}

@Component({
  selector: 'app-captcha-turnstile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #alvo class="captcha"></div>
    @if (falhou()) {
      <p class="erro" role="alert">
        Não foi possível fazer a verificação de segurança. Confira a internet e desative bloqueadores. Depois, toque em
        Voltar e em Continuar para tentar de novo. Suas respostas continuam aqui.
      </p>
    }
  `,
  styles: `
    .captcha { margin-top: 16px; }
    .erro { margin: 8px 0 0; font-size: 14px; color: var(--color-danger, #b42318); }
  `,
})
export class CaptchaTurnstile {
  private readonly documento = inject(DOCUMENT);
  private readonly alvo = viewChild.required<ElementRef<HTMLElement>>('alvo');

  readonly token = output<string | null>();
  protected readonly falhou = signal(false);

  private turnstile: Turnstile | null = null;
  private widgetId: string | null = null;

  constructor() {
    let destruido = false;
    inject(DestroyRef).onDestroy(() => {
      destruido = true;
      if (this.widgetId) this.turnstile?.remove(this.widgetId);
    });

    afterNextRender(() => {
      carregarTurnstile(this.documento)
        .then((turnstile) => {
          if (!destruido) this.renderizar(turnstile);
        })
        .catch(() => this.falhou.set(true));
    });
  }

  resetar(): void {
    if (this.widgetId) this.turnstile?.reset(this.widgetId);
  }

  private renderizar(turnstile: Turnstile): void {
    this.turnstile = turnstile;
    this.widgetId = turnstile.render(this.alvo().nativeElement, {
      sitekey: environment.turnstileSiteKey,
      language: 'pt-br',
      callback: (token: string) => {
        this.falhou.set(false);
        this.token.emit(token);
      },
      'expired-callback': () => this.token.emit(null),
      'error-callback': () => {
        this.falhou.set(true);
        this.token.emit(null);
      },
    });
  }
}
