import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EstadoMascote = 'parado' | 'acenando' | 'pensando' | 'falando' | 'confuso';

/**
 * ADRAbot — o mascote em SVG (verde ADRA, "ADRA" no peito, coração na antena).
 * Estados animados só com CSS; com "reduzir movimento" no sistema, fica parado.
 */
@Component({
  selector: 'app-robo-mascote',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.width.px]': 'tamanho()', '[style.height.px]': 'tamanho()' },
  template: `
    <svg viewBox="0 0 120 120" [class]="'robo ' + estado() + (animado() ? '' : ' quieto')">
      @if (sombra()) {
        <ellipse class="chao" cx="60" cy="114" rx="26" ry="4.5" />
      }
      <g class="corpo-todo">
        <rect x="27" y="78" width="10" height="22" rx="5" class="escuro" />
        <circle cx="32" cy="101" r="5.5" class="verde" />
        <g class="braco-dir">
          <rect x="83" y="78" width="10" height="22" rx="5" class="escuro" />
          <circle cx="88" cy="101" r="5.5" class="verde" />
        </g>
        <rect x="37" y="72" width="46" height="34" rx="13" class="verde" />
        <rect x="41.5" y="81" width="37" height="15" rx="5" class="visor" />
        <text x="60" y="92.2" text-anchor="middle" class="marca">ADRA</text>
        <g class="cabeca">
          <line x1="60" y1="22" x2="60" y2="12" class="antena" />
          <path class="luz" d="M60 14 C55.6 10.6 54 8.6 54 6.6 C54 4.9 55.3 3.6 57 3.6 C58.2 3.6 59.3 4.3 60 5.4 C60.7 4.3 61.8 3.6 63 3.6 C64.7 3.6 66 4.9 66 6.6 C66 8.6 64.4 10.6 60 14 Z" />
          <rect x="19" y="38" width="9" height="18" rx="4" class="escuro" />
          <rect x="92" y="38" width="9" height="18" rx="4" class="escuro" />
          <rect x="25" y="21" width="70" height="52" rx="22" class="verde" />
          <rect x="33" y="30" width="54" height="35" rx="15" class="visor" />
          <g class="olhos">
            <ellipse class="olho" cx="49" cy="45" rx="4.6" ry="5.8" />
            <ellipse class="olho" cx="71" cy="45" rx="4.6" ry="5.8" />
            <circle cx="50.6" cy="43" r="1.5" class="visor" />
            <circle cx="72.6" cy="43" r="1.5" class="visor" />
          </g>
          <circle cx="41" cy="54" r="3.6" class="bochecha" />
          <circle cx="79" cy="54" r="3.6" class="bochecha" />
          <path class="boca" d="M53 54.5 Q60 60.5 67 54.5" />
          <ellipse class="boca-aberta" cx="60" cy="57" rx="5" ry="4" />
        </g>
        <g class="pensamento">
          <rect x="88" y="4" width="30" height="16" rx="8" class="visor borda" />
          <circle cx="96" cy="12" r="2.2" class="verde" />
          <circle cx="103" cy="12" r="2.2" class="verde" />
          <circle cx="110" cy="12" r="2.2" class="verde" />
        </g>
        <text class="duvida" x="98" y="22">?</text>
      </g>
    </svg>
  `,
  styles: `
    :host { display: inline-block; flex: none; }
    svg { width: 100%; height: 100%; overflow: visible; display: block; }
    .verde { fill: #087A63; }
    .escuro { fill: #065C4A; }
    .visor { fill: #E6F2EF; }
    .borda { stroke: #087A63; stroke-width: 1.5; }
    .olho { fill: #032B23; }
    .bochecha { fill: #F2A48F; opacity: .75; }
    .marca { font: 900 10px/1 'Arial Black', Arial, sans-serif; letter-spacing: .6px; fill: #087A63; }
    .antena { stroke: #065C4A; stroke-width: 3; stroke-linecap: round; }
    .luz { fill: #FFD166; }
    .boca { fill: none; stroke: #032B23; stroke-width: 2.6; stroke-linecap: round; }
    .boca-aberta { fill: #032B23; }
    .chao { fill: rgba(3, 43, 35, .16); }
    .duvida { font: 900 22px/1 'Arial Black', Arial, sans-serif; fill: #FFD166; stroke: #065C4A; stroke-width: 1; }

    .corpo-todo { animation: flutuar 3.2s ease-in-out infinite; }
    .chao { animation: sombra 3.2s ease-in-out infinite; transform-origin: 60px 114px; }
    .olho { animation: piscar 4.6s infinite; transform-box: fill-box; transform-origin: center; }
    .luz { animation: pulsar 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .braco-dir { transform-origin: 86px 80px; }
    .cabeca { transform-origin: 60px 70px; transition: transform .4s; }
    .boca-aberta, .pensamento, .duvida { opacity: 0; transition: opacity .25s; }
    .olhos { transition: transform .4s; }

    .acenando .braco-dir { animation: acenar 1s ease-in-out infinite; }
    .pensando .olhos { transform: translate(3px, -3px); }
    .pensando .pensamento { opacity: 1; }
    .pensando .pensamento circle { animation: ponto 1.2s ease-in-out infinite; transform-box: fill-box; }
    .pensando .pensamento circle:nth-child(3) { animation-delay: .2s; }
    .pensando .pensamento circle:nth-child(4) { animation-delay: .4s; }
    .pensando .luz { animation-duration: .6s; }
    .falando .boca { opacity: 0; }
    .falando .boca-aberta { opacity: 1; animation: falar .32s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
    .confuso .cabeca { transform: rotate(-12deg); }
    .confuso .duvida { opacity: 1; animation: balancar 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: bottom center; }

    @keyframes flutuar { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
    @keyframes sombra { 0%, 100% { transform: scaleX(1); opacity: 1; } 50% { transform: scaleX(.82); opacity: .7; } }
    @keyframes piscar { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
    @keyframes pulsar { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: .75; } }
    @keyframes acenar { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-38deg); } 75% { transform: rotate(-18deg); } }
    @keyframes ponto { 0%, 100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(-3px); opacity: 1; } }
    @keyframes falar { from { transform: scaleY(.35); } to { transform: scaleY(1); } }
    @keyframes balancar { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }

    .quieto, .quieto * { animation: none !important; }
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; transition: none !important; }
    }
  `,
})
export class RoboMascote {
  readonly estado = input<EstadoMascote>('parado');
  readonly tamanho = input(48);
  readonly sombra = input(false);
  /** Falso: desenho parado (ex.: ícone no topo da tela, para não distrair). */
  readonly animado = input(true);
}
