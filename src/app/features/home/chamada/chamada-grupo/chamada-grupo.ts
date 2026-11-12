import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { ChamadaService } from '../../../../core/chamada.service';
import { DisciplinarService } from '../../../../core/disciplinar.service';
import { Role } from '../../../../shared/enum/role.enum';
import { StatusPresenca } from '../../../../shared/enum/StatusPresenca';
import { MotivoFalta, MOTIVO_FALTA_LABELS } from '../../../../shared/enum/MotivoFalta';
import { ChamadaGrupoDTO } from '../../../../shared/models/chamada/ChamadaGrupo';
import { SinalizacaoDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';
import { hojeISO } from '../../../../shared/utils/aula.util';
import { dataBr } from '../../../../shared/utils/disciplinar.util';
import {
  DIAS_FAIXA_HISTORICO,
  aniversarioNaAula,
  LIMIAR_FALTAS_CONSECUTIVAS,
  LIMIAR_JUSTIFICADAS_CONSECUTIVAS,
  LinhaChamada,
  ROTULO_PRESENCA,
  SIGLA_PRESENCA,
  atualizarObservacaoFalta,
  contarFaltasConsecutivas,
  contarJustificadasConsecutivas,
  filtrarPorNome,
  linhaChamadaDeAtendido,
  marcarPresenca,
  proximoStatusPresenca,
  rotuloAutorizados,
  validarChamada,
} from '../../../../shared/utils/chamada.util';
import { AniversarioCards } from '../../../../shared/components/aniversario-cards/aniversario-cards';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Badge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { Modal } from '../../../../shared/components/modal/modal';
import { GradeMensal } from '../../../../shared/components/grade-mensal/grade-mensal';

/**
 * FT-17 — chamada de um grupo num dia (`/chamada/grupo/:turmaId/:data`), no modelo
 * do app do oficineiro da Sistema Quality: um botão por atendido que cicla
 * P → F → FJ, contadores no rodapé e "Atualizar chamada" depois de salva.
 * Quem pode editar vem pronto da API (`podeEditar`): Coordenador qualquer dia,
 * Educador Social qualquer dia do mês atual, Assistente Social só lê.
 */
@Component({
  selector: 'app-chamada-grupo',
  imports: [FormsModule, RouterLink, AniversarioCards, Avatar, Badge, Button, Icon, Modal, GradeMensal],
  templateUrl: './chamada-grupo.html',
  styleUrl: './chamada-grupo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChamadaGrupo {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);
  private readonly chamadaService = inject(ChamadaService);
  private readonly disciplinarService = inject(DisciplinarService);

  readonly StatusPresenca = StatusPresenca;
  readonly MotivoFalta = MotivoFalta;
  readonly MOTIVO_FALTA_LABELS = MOTIVO_FALTA_LABELS;
  readonly SIGLA = SIGLA_PRESENCA;
  readonly ROTULO = ROTULO_PRESENCA;
  readonly dataBr = dataBr;
  readonly rotuloAutorizados = rotuloAutorizados;

  readonly chamada = signal<ChamadaGrupoDTO | null>(null);
  readonly atendidos = signal<LinhaChamada[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly salvando = signal(false);
  readonly busca = signal('');
  readonly aba = signal<'atendidos' | 'grade'>('atendidos');
  /** Mês mostrado na aba "Grade do mês" — começa no mês da chamada aberta. */
  readonly mesGrade = signal('');
  /** "Atualizar chamada": reabre a edição de uma chamada já salva. */
  readonly atualizando = signal(false);
  private readonly sinalizacoes = signal<ReadonlyMap<number, SinalizacaoDisciplinarDTO>>(new Map());

  readonly lancada = computed(() => this.chamada()?.lancada ?? false);
  readonly podeEditar = computed(() => this.chamada()?.podeEditar ?? false);
  readonly editando = computed(() => this.podeEditar() && (!this.lancada() || this.atualizando()));
  readonly mostrarStatus = computed(() => this.editando() || this.lancada());

  /** Aviso no topo da lista quando não dá para lançar agora — e o porquê. */
  readonly aviso = computed<string | null>(() => {
    const chamada = this.chamada();
    if (!chamada || chamada.podeEditar) return null;
    if (chamada.data > hojeISO()) return `A chamada abre no dia (${dataBr(chamada.data)}).`;
    if (this.auth.currentProfile() === Role.EDUCADOR) {
      return 'O Educador Social lança e corrige a chamada do mês atual. Para meses anteriores, peça à coordenação.';
    }
    return chamada.lancada ? null : 'A chamada deste dia ainda não foi feita.';
  });

  readonly atendidosVisiveis = computed(() => filtrarPorNome(this.atendidos(), this.busca()));
  readonly totalPresentes = computed(() => this.contar(StatusPresenca.PRESENTE));
  readonly totalFaltas = computed(() => this.contar(StatusPresenca.FALTA));
  readonly totalJustificadas = computed(() => this.contar(StatusPresenca.FALTA_JUSTIFICADA));

  readonly dataPorExtenso = computed(() => {
    const data = this.chamada()?.data;
    if (!data) return '';
    const [ano, mes, dia] = data.split('-').map(Number);
    const semana = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { weekday: 'long' });
    return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${dataBr(data)}`;
  });

  /* ---------- Ficha individual (toque no nome) ---------- */
  readonly fichaId = signal<number | null>(null);
  readonly fichaAberta = computed(() => this.fichaId() !== null);
  readonly fichaIndice = computed(() => this.atendidosVisiveis().findIndex((a) => a.assistidoId === this.fichaId()));
  readonly fichaAtendido = computed<LinhaChamada | null>(() => this.atendidosVisiveis()[this.fichaIndice()] ?? null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const turmaId = Number(params.get('turmaId'));
      const data = params.get('data') ?? '';
      this.busca.set('');
      this.aba.set('atendidos');
      this.mesGrade.set(data.slice(0, 7));
      this.atualizando.set(false);
      this.sucesso.set(null);
      this.fichaId.set(null);
      this.chamada.set(null);
      if (!Number.isInteger(turmaId) || turmaId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        this.erro.set('Chamada não encontrada.');
        this.carregando.set(false);
        return;
      }
      this.carregar(turmaId, data);
    });
  }

  private async carregar(turmaId: number, data: string): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      this.aplicar(await this.chamadaService.carregarGrupo(turmaId, data));
      this.carregarSinalizacoes();
    } catch {
      this.erro.set('Não foi possível carregar a chamada.');
    } finally {
      this.carregando.set(false);
    }
  }

  private aplicar(chamada: ChamadaGrupoDTO): void {
    this.chamada.set(chamada);
    this.atendidos.set(chamada.atendidos.map(linhaChamadaDeAtendido));
  }

  /** Selo "Suspenso" do Sistema Disciplinar. Falhar aqui não pode travar a chamada. */
  private async carregarSinalizacoes(): Promise<void> {
    const chamada = this.chamada();
    if (!chamada) return;
    try {
      const lista = await this.disciplinarService.buscarSinalizacoes(
        this.atendidos().map((a) => a.assistidoId),
        chamada.data,
      );
      this.sinalizacoes.set(new Map(lista.map((s) => [s.assistidoId, s])));
    } catch {
      this.sinalizacoes.set(new Map());
    }
  }

  /** FT-13: a API já manda quem está suspenso no dia; as sinalizações cobrem chamadas ainda não reabertas. */
  suspensoAte(atendido: LinhaChamada): string | null {
    return atendido.suspensoAte ?? this.sinalizacoes().get(atendido.assistidoId)?.suspensoAte ?? null;
  }

  /** "Niver" da planilha: selo no dia do aniversário, data discreta quando cai no mês. */
  aniversario(atendido: LinhaChamada) {
    return aniversarioNaAula(atendido.dataNascimento, this.chamada()?.data);
  }

  faixaHistorico(atendido: LinhaChamada) {
    // Mais antiga à esquerda, como na planilha.
    return atendido.historicoRecente.slice(0, DIAS_FAIXA_HISTORICO).reverse();
  }

  faltasSeguidas(atendido: LinhaChamada): number {
    const n = contarFaltasConsecutivas(atendido.historicoRecente);
    return n >= LIMIAR_FALTAS_CONSECUTIVAS ? n : 0;
  }

  justificadasSeguidas(atendido: LinhaChamada): number {
    const n = contarJustificadasConsecutivas(atendido.historicoRecente);
    return n >= LIMIAR_JUSTIFICADAS_CONSECUTIVAS ? n : 0;
  }

  status(atendido: LinhaChamada): StatusPresenca {
    return atendido.statusPresenca ?? StatusPresenca.PRESENTE;
  }

  classeStatus(status: StatusPresenca | null): string {
    switch (status) {
      case StatusPresenca.FALTA:
        return 'st-f';
      case StatusPresenca.FALTA_JUSTIFICADA:
        return 'st-fj';
      default:
        return 'st-p';
    }
  }

  rotuloBotao(atendido: LinhaChamada): string {
    const atual = this.status(atendido);
    return `${atendido.nomeCompleto}: ${ROTULO_PRESENCA[atual]}. Tocar para marcar ${ROTULO_PRESENCA[proximoStatusPresenca(atual)]}.`;
  }

  alternar(atendido: LinhaChamada): void {
    if (!this.editando() || this.suspensoAte(atendido)) return;
    this.definirStatus(atendido.assistidoId, proximoStatusPresenca(this.status(atendido)));
  }

  definirStatus(assistidoId: number, status: StatusPresenca): void {
    this.atendidos.update((lista) => marcarPresenca(lista, assistidoId, status));
    this.sucesso.set(null);
  }

  mudarObservacao(assistidoId: number, observacao: string): void {
    this.atendidos.update((lista) => atualizarObservacaoFalta(lista, assistidoId, observacao));
  }

  abrirFicha(atendido: LinhaChamada): void {
    this.fichaId.set(atendido.assistidoId);
  }

  fecharFicha(): void {
    this.fichaId.set(null);
  }

  navegarFicha(passo: number): void {
    const proximo = this.atendidosVisiveis()[this.fichaIndice() + passo];
    if (proximo) this.fichaId.set(proximo.assistidoId);
  }

  iniciarAtualizacao(): void {
    this.atualizando.set(true);
    this.sucesso.set(null);
  }

  async cancelarEdicao(): Promise<void> {
    const chamada = this.chamada();
    if (!chamada) return;
    this.atualizando.set(false);
    // Descarta o que foi marcado e volta ao que está salvo.
    await this.carregar(chamada.turmaId, chamada.data);
  }

  async salvar(): Promise<void> {
    const chamada = this.chamada();
    if (!chamada || this.salvando()) return;

    const erroValidacao = validarChamada(this.atendidos());
    if (erroValidacao) {
      this.erro.set(erroValidacao);
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    try {
      this.aplicar(await this.chamadaService.salvarGrupo(chamada.turmaId, chamada.data, this.atendidos()));
      this.atualizando.set(false);
      this.sucesso.set('Chamada salva.');
    } catch {
      this.erro.set('Não foi possível salvar a chamada. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  /** Tocar num dia da grade abre a chamada daquele dia, na mesma tela. */
  abrirDia(data: string): void {
    const chamada = this.chamada();
    if (chamada) this.router.navigate(['/chamada/grupo', chamada.turmaId, data]);
  }

  voltar(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/chamada']);
    }
  }

  private contar(status: StatusPresenca): number {
    return this.atendidos().filter((a) => this.status(a) === status).length;
  }
}
