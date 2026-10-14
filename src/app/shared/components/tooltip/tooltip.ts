import { Directive, ElementRef, Renderer2, inject, input } from '@angular/core';

/**
 * Tooltip acessível aplicado diretamente num elemento existente (ex.: botão de
 * ação de uma tabela), sem exigir um componente wrapper. Funciona em
 * hover E em foco de teclado — requisito de acessibilidade, já que um
 * tooltip que só aparece no `mouseenter` fica inacessível para quem navega
 * só com teclado.
 */
@Directive({
  selector: '[appTooltip]',
  host: {
    class: 'tooltip-host',
    '(mouseenter)': 'mostrar()',
    '(mouseleave)': 'esconder()',
    '(focus)': 'mostrar()',
    '(blur)': 'esconder()',
  },
})
export class TooltipDirective {
  appTooltip = input<string>('');

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private bolha: HTMLElement | null = null;

  protected mostrar(): void {
    const texto = this.appTooltip();
    if (!texto || this.bolha) return;

    this.bolha = this.renderer.createElement('span');
    this.renderer.addClass(this.bolha, 'tooltip-bubble');
    this.renderer.setAttribute(this.bolha, 'role', 'tooltip');
    this.renderer.appendChild(this.bolha, this.renderer.createText(texto));
    this.renderer.appendChild(this.el.nativeElement, this.bolha);
  }

  protected esconder(): void {
    if (!this.bolha) return;
    this.renderer.removeChild(this.el.nativeElement, this.bolha);
    this.bolha = null;
  }
}
