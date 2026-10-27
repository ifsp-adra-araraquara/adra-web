import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { PainelMensalDTO } from '../../../shared/models/painel/Painel';
import { FREQUENCIA_MINIMA, MES_CURTO, nomeMes } from './painel.util';

/** Margens do gráfico; a largura é a do contêiner (escala 1:1, texto sempre legível). */
const MARGEM = { altura: 190, esq: 36, dir: 16, topo: 18, base: 28 };

/**
 * FT-05 — frequência dos últimos 6 meses (linha, com referência de 75% e
 * tooltip). SVG desenhado na largura real medida por um ResizeObserver,
 * em vez de escalar um viewBox fixo: no celular os rótulos sumiriam.
 */
@Component({
  selector: 'app-painel-tendencia',
  templateUrl: './painel-tendencia.html',
  styleUrls: ['./painel-base.css', './painel-tendencia.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PainelTendencia {
  private readonly destroyRef = inject(DestroyRef);

  readonly pontos = input<PainelMensalDTO['tendencia'] | null>(null);
  readonly FREQUENCIA_MINIMA = FREQUENCIA_MINIMA;

  private readonly larguraGrafico = signal(640);
  readonly G = computed(() => ({ ...MARGEM, largura: this.larguraGrafico() }));
  private readonly graficoRef = viewChild<ElementRef<HTMLElement>>('grafico');
  /** Mês sob o cursor (índice), para o tooltip. */
  readonly pontoAtivo = signal<number | null>(null);

  readonly tendencia = computed(() => {
    const G = this.G();
    const pontos = this.pontos() ?? [];
    const larguraUtil = G.largura - G.esq - G.dir;
    const alturaUtil = G.altura - G.topo - G.base;
    const passo = larguraUtil / Math.max(pontos.length - 1, 1);
    // Eixo começa perto dos dados (com a linha dos 75% sempre visível): de
    // 0 a 100 a variação de poucos pontos sumiria. Por isso a linha não tem
    // área preenchida — área com base fora do zero exagera a diferença.
    const valores = pontos.map((p) => p.percentual).filter((v): v is number => v != null);
    const minimo = Math.max(0, Math.floor((Math.min(FREQUENCIA_MINIMA, ...valores) - 10) / 10) * 10);
    const passoGrade = 100 - minimo > 40 ? 20 : 10;
    const y = (v: number) => G.topo + alturaUtil - ((v - minimo) / (100 - minimo)) * alturaUtil;

    const nos = pontos.map((p, i) => ({
      ...p,
      x: G.esq + i * passo,
      y: p.percentual == null ? null : y(p.percentual),
      rotulo: MES_CURTO[Number(p.mes.slice(5, 7)) - 1],
      titulo: nomeMes(p.mes),
      atual: i === pontos.length - 1,
    }));

    // Mês sem aula quebra a linha em trechos — não inventa ponto no vazio.
    const trechos: (typeof nos)[] = [];
    let trecho: typeof nos = [];
    for (const n of nos) {
      if (n.y == null) {
        if (trecho.length) trechos.push(trecho);
        trecho = [];
      } else {
        trecho.push(n);
      }
    }
    if (trecho.length) trechos.push(trecho);

    return {
      nos,
      passo,
      linhas: trechos.map((t) => t.map((n, i) => `${i ? 'L' : 'M'}${n.x},${n.y}`).join(' ')),
      grade: Array.from({ length: (100 - minimo) / passoGrade + 1 }, (_, i) => minimo + i * passoGrade).map((v) => ({
        v,
        y: y(v),
      })),
      yMinima: y(FREQUENCIA_MINIMA),
      base: G.topo + alturaUtil,
      vazio: nos.every((n) => n.y == null),
    };
  });

  readonly tooltip = computed(() => {
    const i = this.pontoAtivo();
    const n = i == null ? null : this.tendencia().nos[i];
    if (!n) return null;
    return {
      esquerda: (n.x / this.G().largura) * 100,
      titulo: n.titulo,
      valor: n.percentual == null ? 'Sem aula realizada' : `${n.percentual}% de presença`,
      aulas: n.aulas,
    };
  });

  readonly tendenciaDescricao = computed(
    () =>
      'Frequência mensal: ' +
      this.tendencia()
        .nos.map((n) => `${n.titulo} ${n.percentual == null ? 'sem aula' : n.percentual + '%'}`)
        .join('; '),
  );

  constructor() {
    // Um único ResizeObserver no contêiner; só atualiza quando a largura
    // (arredondada) muda de fato. O gráfico só existe depois dos dados, por
    // isso o effect observa o elemento quando ele aparece.
    const observador = new ResizeObserver(([entrada]) => {
      const largura = Math.round(entrada.contentRect.width);
      if (largura > 0 && largura !== this.larguraGrafico()) this.larguraGrafico.set(largura);
    });
    effect(() => {
      const el = this.graficoRef()?.nativeElement;
      observador.disconnect();
      if (el) observador.observe(el);
    });
    this.destroyRef.onDestroy(() => observador.disconnect());
  }
}
