import { DestroyRef, Directive, ElementRef, Renderer2, RendererStyleFlags2, inject, input } from '@angular/core';

export type PosicaoTooltip = 'top' | 'right';

/** Espaço entre o elemento e o balão. */
const DISTANCIA = 8;

/**
 * Tooltip acessível aplicado diretamente num elemento existente (ex.: botão de
 * ação de uma tabela), sem exigir um componente wrapper. Funciona em
 * hover E em foco de teclado — requisito de acessibilidade, já que um
 * tooltip que só aparece no `mouseenter` fica inacessível para quem navega
 * só com teclado.
 *
 * O balão vai para o <body> com posição fixa, calculada a partir do
 * elemento: assim nenhum contêiner com rolagem (menu lateral, tabela,
 * modal) consegue cortá-lo. Em cima por padrão; se não couber, vai para
 * baixo. `appTooltipPosicao="right"` abre ao lado (menu recolhido).
 */
@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'mostrar()',
    '(mouseleave)': 'esconder()',
    '(focus)': 'mostrar()',
    '(blur)': 'esconder()',
  },
})
export class TooltipDirective {
  appTooltip = input<string>('');
  appTooltipPosicao = input<PosicaoTooltip>('top');

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private bolha: HTMLElement | null = null;
  private pararDeOuvirRolagem: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.esconder());
  }

  protected mostrar(): void {
    const texto = this.appTooltip();
    if (!texto || this.bolha) return;

    const bolha: HTMLElement = this.renderer.createElement('span');
    this.renderer.addClass(bolha, 'tooltip-bubble');
    this.renderer.setAttribute(bolha, 'role', 'tooltip');
    this.renderer.appendChild(bolha, this.renderer.createText(texto));
    this.renderer.appendChild(document.body, bolha);
    this.bolha = bolha;
    this.posicionar(bolha);

    // Rolagem com o balão aberto deixaria ele "solto" no lugar antigo.
    this.pararDeOuvirRolagem = this.renderer.listen('window', 'scroll', () => this.esconder());
  }

  protected esconder(): void {
    this.pararDeOuvirRolagem?.();
    this.pararDeOuvirRolagem = null;
    if (!this.bolha) return;
    this.renderer.removeChild(document.body, this.bolha);
    this.bolha = null;
  }

  private posicionar(bolha: HTMLElement): void {
    const alvo = (this.el.nativeElement as HTMLElement).getBoundingClientRect();
    const { width, height } = bolha.getBoundingClientRect();

    let lado: 'top' | 'bottom' | 'right' = this.appTooltipPosicao();
    if (lado === 'right' && alvo.right + DISTANCIA + width > window.innerWidth - 4) lado = 'top';
    if (lado === 'top' && alvo.top - DISTANCIA - height < 4) lado = 'bottom';

    let left: number;
    let top: number;
    if (lado === 'right') {
      left = alvo.right + DISTANCIA;
      top = alvo.top + alvo.height / 2 - height / 2;
    } else {
      left = alvo.left + alvo.width / 2 - width / 2;
      top = lado === 'top' ? alvo.top - DISTANCIA - height : alvo.bottom + DISTANCIA;
      // Não deixa o balão sair pela lateral da tela.
      left = Math.min(Math.max(4, left), window.innerWidth - width - 4);
    }

    this.renderer.addClass(bolha, `tooltip-${lado}`);
    this.renderer.setStyle(bolha, 'left', `${Math.round(left)}px`);
    this.renderer.setStyle(bolha, 'top', `${Math.round(top)}px`);
    // A seta continua apontando para o centro do elemento, mesmo com o balão ajustado na borda.
    if (lado !== 'right') {
      this.renderer.setStyle(
        bolha,
        '--seta-x',
        `${Math.round(alvo.left + alvo.width / 2 - left)}px`,
        RendererStyleFlags2.DashCase,
      );
    }
  }
}
