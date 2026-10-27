import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { OficinaOpcao, PainelService } from '../../../core/painel.service';
import { AtividadePainel, PainelHojeDTO, PainelMensalDTO } from '../../../shared/models/painel/Painel';
import { hojeISO } from '../../../shared/utils/aula.util';
import { NIVEIS_DISCIPLINARES, NivelDisciplinar } from '../../../shared/enum/NivelDisciplinar';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Icon, IconName } from '../../../shared/components/icon/icon';
import { PainelAtencao } from './painel-atencao';
import { PainelIndicadores } from './painel-indicadores';
import { PainelTendencia } from './painel-tendencia';
import { PainelTurmas } from './painel-turmas';
import { dataCurta, nomeMes, variacao } from './painel.util';

/**
 * Cor de cada nível na barra empilhada, na ordem de gravidade dos cartazes.
 * Paleta validada (dataviz validate_palette: CVD e visão normal ok). O
 * amarelo tem contraste baixo com o fundo, então a legenda traz o número.
 */
const COR_NIVEL: Record<NivelDisciplinar, string> = {
  [NivelDisciplinar.OCORRENCIA]: '#D9A21B',
  [NivelDisciplinar.ADVERTENCIA]: '#D85A30',
  [NivelDisciplinar.SUSPENSAO]: '#952236',
  [NivelDisciplinar.UNIFORME]: '#378ADD',
};

/** Raio da rosca de faixa etária no viewBox 0..120 (traço de 14). */
const RAIO_ROSCA = 48;

/**
 * Cor fixa por faixa (a cor segue a faixa, não a posição). As três
 * principais seguem o protótipo; paleta validada (dataviz validate_palette).
 */
const COR_FAIXA: Record<string, string> = {
  'Até 5': '#9467C9',
  '6–9': '#00846A',
  '10–13': '#52B788',
  '14–17': '#3A86D8',
  '18+': '#D9A21B',
};

/**
 * FT-05 — Painel do Coordenador (tela inicial do perfil).
 *
 * Dados: dois GETs em paralelo, já agregados no back. `/mensal` depende de
 * mês + oficina e fica em cache por combinação (PainelService); `/hoje`
 * (atenção, semana e atividade) é pedido uma vez. Os blocos maiores são
 * componentes filhos (indicadores, tendência, turmas, atenção) que só
 * recebem a fatia de dados que desenham.
 *
 * Gráficos sem biblioteca (SVG/CSS): são 6 pontos e poucas turmas; uma lib
 * de gráficos pesaria mais que a tela inteira.
 */
@Component({
  selector: 'app-painel',
  imports: [Avatar, Icon, PainelAtencao, PainelIndicadores, PainelTendencia, PainelTurmas],
  templateUrl: './painel.html',
  styleUrls: ['./painel-base.css', './painel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Painel implements OnInit {
  private readonly painelService = inject(PainelService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly mesAtual = hojeISO().slice(0, 7);

  readonly mes = signal(this.mesAtual);
  readonly oficinaId = signal<number | null>(null);
  readonly oficinas = signal<OficinaOpcao[]>([]);
  readonly mensal = signal<PainelMensalDTO | null>(null);
  readonly hoje = signal<PainelHojeDTO | null>(null);
  readonly carregandoMes = signal(true);
  readonly erroMes = signal<string | null>(null);
  readonly erroHoje = signal<string | null>(null);

  readonly primeiroNome = computed(() => (this.auth.currentUser()?.name ?? '').split(' ')[0]);

  /** "Boa tarde, Juliana" — pela hora de quem abre o painel. */
  readonly saudacao = computed(() => {
    const hora = new Date().getHours();
    const periodo = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    return this.primeiroNome() ? `${periodo}, ${this.primeiroNome()}` : periodo;
  });

  /** "Segunda-feira, 26 de outubro" */
  readonly dataHoje = computed(() => {
    const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  });
  readonly ehMesAtual = computed(() => this.mes() === this.mesAtual);
  readonly tituloMes = computed(() => nomeMes(this.mes()));
  readonly atualizadoAs = computed(() => this.mensal()?.geradoEm?.slice(11, 16) ?? '');

  /* ---------------- Disciplina (barra empilhada) ---------------- */

  readonly disciplina = computed(() => {
    const m = this.mensal();
    if (!m) return null;
    const d = m.disciplina;
    const niveis = [
      { nivel: NivelDisciplinar.OCORRENCIA, valor: d.ocorrencias },
      { nivel: NivelDisciplinar.ADVERTENCIA, valor: d.advertencias },
      { nivel: NivelDisciplinar.SUSPENSAO, valor: d.suspensoes },
      { nivel: NivelDisciplinar.UNIFORME, valor: d.uniforme },
    ];
    const total = niveis.reduce((s, n) => s + n.valor, 0);
    return {
      total,
      variacao: variacao(total - d.totalMesAnterior, m.mes, '', false),
      segmentos: niveis.map((n) => ({
        ...n,
        rotulo: NIVEIS_DISCIPLINARES[n.nivel].plural,
        cor: COR_NIVEL[n.nivel],
        largura: total ? (n.valor / total) * 100 : 0,
      })),
    };
  });

  /* ---------------- Faixa etária (rosca) ---------------- */

  /**
   * Segmentos da rosca. Só entram faixas com alguém; cada segmento perde
   * `ESPACO` no fim para o vão de 2px que separa as cores. Geometria no
   * viewBox 0..120 (raio 48): o comprimento é a fração da circunferência.
   */
  readonly faixas = computed(() => {
    const faixas = (this.mensal()?.faixasEtarias ?? []).filter((f) => f.total > 0);
    const total = faixas.reduce((s, f) => s + f.total, 0);
    const circunferencia = 2 * Math.PI * RAIO_ROSCA;
    const espaco = faixas.length > 1 ? 2 : 0;
    let inicio = 0;
    const segmentos = faixas.map((f) => {
      const comprimento = (f.total / total) * circunferencia;
      const seg = {
        ...f,
        legenda: f.rotulo === 'Sem data' ? 'Sem data de nascimento' : `${f.rotulo} anos`,
        cor: COR_FAIXA[f.rotulo] ?? '#B4B2A9',
        percentual: Math.round((f.total / total) * 100),
        traco: `${Math.max(comprimento - espaco, 0.5)} ${circunferencia}`,
        deslocamento: -inicio,
      };
      inicio += comprimento;
      return seg;
    });
    return {
      total,
      segmentos,
      descricao:
        `${total} assistidos ativos: ` + segmentos.map((s) => `${s.legenda}, ${s.total}`).join('; '),
    };
  });
  readonly RAIO_ROSCA = RAIO_ROSCA;

  async ngOnInit(): Promise<void> {
    this.carregarHoje();
    this.painelService.oficinas().then((o) => this.oficinas.set(o)).catch(() => this.oficinas.set([]));
    await this.carregarMes();
  }

  mudarMes(delta: number): void {
    const [ano, m] = this.mes().split('-').map(Number);
    const total = ano * 12 + (m - 1) + delta;
    const novo = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
    if (novo > this.mesAtual) return;
    this.mes.set(novo);
    this.carregarMes();
  }

  mudarOficina(valor: string): void {
    this.oficinaId.set(valor ? Number(valor) : null);
    this.carregarMes();
  }

  atualizar(): void {
    this.carregarHoje();
    this.carregarMes(true);
  }

  /* ---------------- Navegação ---------------- */

  abrirAssistido(assistidoId: number): void {
    this.router.navigate(['/assistidos'], { queryParams: { assistidoId } });
  }

  abrirAtividade(a: AtividadePainel): void {
    if (a.tipo === 'CHAMADA') this.router.navigate(['/chamada/aula', a.referenciaId]);
    else if (a.assistidoId != null) this.abrirAssistido(a.assistidoId);
  }

  /* ---------------- Formatação ---------------- */

  textoAtividade(a: AtividadePainel): string {
    switch (a.tipo) {
      case 'CHAMADA':
        return `Chamada lançada${a.detalhe ? ' · aula de ' + a.detalhe : ''}`;
      case 'DISCIPLINAR':
        return `${NIVEIS_DISCIPLINARES[a.detalhe as NivelDisciplinar]?.rotulo ?? 'Registro'} registrada`;
      default:
        return 'Assistido cadastrado';
    }
  }

  iconeAtividade(a: AtividadePainel): IconName {
    return a.tipo === 'CHAMADA' ? 'check-square' : a.tipo === 'DISCIPLINAR' ? 'flag' : 'user-plus';
  }

  /** "agora", "há 25 min", "há 3 h", "ontem", "12/10". */
  quando(iso: string | null): string {
    if (!iso) return '';
    const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutos < 1) return 'agora';
    if (minutos < 60) return `há ${minutos} min`;
    if (minutos < 24 * 60) return `há ${Math.round(minutos / 60)} h`;
    if (minutos < 48 * 60) return 'ontem';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  diaAniversario(iso: string): string {
    if (iso === this.hoje()?.hoje) return 'hoje';
    const [a, m, d] = iso.split('-').map(Number);
    const semana = new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return `${semana}, ${dataCurta(iso)}`;
  }

  private async carregarMes(recarregar = false): Promise<void> {
    const mes = this.mes();
    const oficina = this.oficinaId();
    const vigente = () => mes === this.mes() && oficina === this.oficinaId();
    this.carregandoMes.set(true);
    this.erroMes.set(null);
    try {
      const dados = await this.painelService.mensal(mes, oficina, recarregar);
      if (vigente()) this.mensal.set(dados);
    } catch {
      if (vigente()) this.erroMes.set('Não foi possível carregar os números do mês.');
    } finally {
      if (vigente()) this.carregandoMes.set(false);
    }
  }

  private async carregarHoje(): Promise<void> {
    this.erroHoje.set(null);
    try {
      this.hoje.set(await this.painelService.hoje());
    } catch {
      this.erroHoje.set('Não foi possível carregar o que precisa de atenção.');
    }
  }
}
