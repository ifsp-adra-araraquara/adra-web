import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DatePipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { AulaService } from '../../../core/aula.service';
import { ChamadaService } from '../../../core/chamada.service';
import { ArquivoService } from '../../../core/arquivo.service';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { ArquivoResponseDTO } from '../../../shared/models/arquivo/ArquivoResponseDTO';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { StatusPresenca } from '../../../shared/enum/StatusPresenca';
import { Role } from '../../../shared/enum/role.enum';
import { MotivoFalta, MOTIVO_FALTA_OPTIONS } from '../../../shared/enum/MotivoFalta';
import { SituacaoAula } from '../../../shared/enum/SituacaoAula';
import { calcularSituacaoAula, ehAulaDeHoje } from '../../../shared/utils/aula.util';
import {
  LinhaChamada,
  atualizarMotivoFalta as atualizarMotivoFaltaUtil,
  atualizarObservacaoFalta as atualizarObservacaoFaltaUtil,
  marcarPresenca as marcarPresencaUtil,
  marcarTodosPresentes as marcarTodosPresentesUtil,
  podeCorrigirDataChamada,
  podeEditarChamada as podeEditarChamadaUtil,
  validarChamada,
  contarFaltasConsecutivas,
  LIMIAR_FALTAS_CONSECUTIVAS,
  DIAS_FAIXA_HISTORICO,
  OrdemNome,
  ordenarPorNome,
  LIMIAR_JUSTIFICADAS_CONSECUTIVAS,
  contarJustificadasConsecutivas,
  rotuloAutorizados,
} from '../../../shared/utils/chamada.util';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { AulaResponseDTO } from '../../../shared/models/aula/AulaResponseDTO';
import { Button } from '../../../shared/components/button/button';
import { RastreabilidadeTooltip } from '../../../shared/components/rastreabilidade-tooltip/rastreabilidade-tooltip';
import { Icon } from '../../../shared/components/icon/icon';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Badge } from '../../../shared/components/badge/badge';

type AbaAulaCompleta = 'alunos' | 'materiais';

/**
 * Página "Aula completa" — aberta a partir do botão no <app-aula-modal>.
 * Mostra os alunos em cartões (grade) em vez da lista do modal, mas reusa a
 * mesma lógica de chamada (ChamadaService/chamada.util) — ver os comentários
 * lá pra entender por que isso importa: antes desta página buscar o roster
 * via /api/assistidos (filtrando por status ATUAL) em vez da fonte única
 * /api/chamadas/aula/{id}, aulas antigas sumiam com alunos que foram
 * desligados depois (mesmo bug que CA-70.2 já tinha corrigido no modal). E
 * só Sociopedagógico conseguia salvar aqui — Coordenador (que também pode)
 * ficava travado por engano.
 */
import { AniversarioCards } from '../../../shared/components/aniversario-cards/aniversario-cards';

@Component({
  selector: 'app-aula-completa',
  standalone: true,
  imports: [AniversarioCards, Icon, FormsModule, Button, RastreabilidadeTooltip, Avatar, Badge, DatePipe],
  templateUrl: './aula-completa.html',
  styleUrl: './aula-completa.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulaCompleta implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly aulaService = inject(AulaService);
  private readonly chamadaService = inject(ChamadaService);
  private readonly arquivoService = inject(ArquivoService);
  private readonly location = inject(Location);
  private readonly api = environment.apiUrl;

  readonly StatusPresenca = StatusPresenca;
  readonly MotivoFalta = MotivoFalta;
  readonly motivoFaltaOptions = MOTIVO_FALTA_OPTIONS;

  // ── Aba Materiais ────────────────────────────────────────────────────────
  // O arquivo vai pro POST /api/arquivos com dono AULA (entidadeId = id da aula).
  // Regras (o back aplica; aqui só mostra/esconde):
  //  - Oficineiro da turma envia e vê/abre/exclui SÓ os que ele enviou (o back já filtra a lista);
  //  - Coordenação vê todos, com quem enviou, sem enviar/excluir.
  readonly EntidadeArquivo = EntidadeArquivo;
  readonly CategoriaArquivo = CategoriaArquivo;
  /** Espelha CategoriaArquivo.MATERIAL_AULA do back — mudou lá, mude aqui. */
  readonly tiposMaterialAceitos = ['application/pdf'];
  readonly tamanhoMaximoMaterialBytes = 2 * 1024 * 1024;
  readonly aulaId = Number(this.route.snapshot.paramMap.get('aulaId')) || null;
  readonly enviandoMaterial = signal(false);
  readonly erroMaterial = signal<string | null>(null);
  readonly materiais = signal<ArquivoResponseDTO[]>([]);
  readonly carregandoMateriais = signal(false);
  readonly abrindoMaterialId = signal<number | null>(null);
  /** Exclusão em dois cliques: 1º marca, 2º confirma (sem diálogo do navegador). */
  readonly confirmandoExclusaoId = signal<number | null>(null);
  readonly excluindoMaterialId = signal<number | null>(null);

  /** Recarrega ao entrar na aba e após qualquer envio/exclusão (ArquivoService.revisaoArquivos). */
  private readonly recarregarMateriais = effect(() => {
    this.arquivoService.revisaoArquivos();
    if (this.aba() === 'materiais') untracked(() => this.carregarMateriais());
  });

  readonly aba = signal<AbaAulaCompleta>('alunos');
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly salvando = signal(false);
  readonly salvo = signal(false);
  readonly aula = signal<AulaComDetalhesResponseDTO | null>(null);
  /* Histórico recente no roster (mesma faixa e alerta do modal de chamada). */
  readonly limiarFaltasConsecutivas = LIMIAR_FALTAS_CONSECUTIVAS;

  faltasConsecutivasDe(aluno: LinhaChamada): number {
    return contarFaltasConsecutivas(aluno.historicoRecente);
  }

  /** Últimos dias, mais recente primeiro — bolinhas ao lado do nome. */
  faixaHistoricoDe(aluno: LinhaChamada) {
    return aluno.historicoRecente.slice(0, DIAS_FAIXA_HISTORICO);
  }

  readonly alunos = signal<LinhaChamada[]>([]);

  /* Ordem A–Z / Z–A, alerta de justificadas seguidas e quem pode buscar. */
  readonly ordemNome = signal<OrdemNome>('az');
  readonly alunosOrdenados = computed(() => ordenarPorNome(this.alunos(), this.ordemNome()));
  readonly limiarJustificadasConsecutivas = LIMIAR_JUSTIFICADAS_CONSECUTIVAS;
  readonly rotuloAutorizados = rotuloAutorizados;

  justificadasConsecutivasDe(aluno: LinhaChamada): number {
    return contarJustificadasConsecutivas(aluno.historicoRecente);
  }

  private readonly perfil = computed(() => this.auth.currentProfile());

  /** US-67: quem tem acesso à edição/correção de chamada (lançar ou corrigir) — mesma regra do <app-aula-modal>. */
  readonly podeEditarChamada = computed(() => podeEditarChamadaUtil(this.perfil()));
  /** Só o Oficineiro envia material da aula (o back confere se a turma é dele). */
  readonly podeEnviarMaterial = computed(() => this.perfil() === Role.OFICINEIRO);
  private readonly meuUsuarioId = computed(() => this.auth.currentUserResponse()?.usuarioId ?? null);
  /** Coordenação vê de todos — aí vale mostrar quem enviou. */
  readonly mostrarAutorMaterial = computed(() => this.perfil() !== Role.OFICINEIRO);
  /** Nomes de quem enviou, sem repetir — pro resumo da visão da Coordenação. */
  readonly autoresMateriais = computed(() => [
    ...new Set(this.materiais().map((m) => m.enviadoPorNome || 'não informado')),
  ]);

  readonly situacao = computed<SituacaoAula | null>(() => {
    const aula = this.aula();
    return aula ? calcularSituacaoAula(aula.dataAula, aula.statusAula) : null;
  });
  readonly situacaoFinalizada = computed(() => this.situacao() === SituacaoAula.FINALIZADA);

  /**
   * CA-65.3/US-67: sociopedagógico só realiza/corrige a chamada no dia da
   * aula; coordenador corrige chamada de qualquer data — mesma regra do
   * <app-aula-modal> (ver chamada.util.podeCorrigirDataChamada).
   */
  private readonly aulaEhHoje = computed(() => {
    const aula = this.aula();
    return aula ? ehAulaDeHoje(aula.dataAula) : false;
  });
  private readonly podeCorrigirData = computed(() =>
    podeCorrigirDataChamada(this.perfil(), this.aulaEhHoje()),
  );
  readonly mostrarAvisoForaDoDia = computed(() => this.podeEditarChamada() && !this.podeCorrigirData());

  /** Trava de edição pra chamada já finalizada — mesma lógica do <app-aula-modal>. */
  readonly desbloquearEdicaoChamada = signal(false);
  readonly mostrarAvisoChamadaFeita = computed(
    () =>
      this.podeEditarChamada() &&
      this.podeCorrigirData() &&
      this.situacaoFinalizada() &&
      !this.desbloquearEdicaoChamada(),
  );
  readonly textoBotaoSalvar = computed(() =>
    this.situacaoFinalizada() ? 'Salvar alterações' : 'Salvar chamada',
  );

  /** Controles de presença ficam travados nesses casos — mesma combinação em todo método de edição. */
  private readonly edicaoBloqueada = computed(
    () => !this.podeEditarChamada() || this.mostrarAvisoChamadaFeita() || this.mostrarAvisoForaDoDia(),
  );

  desbloquearEdicao(): void {
    this.desbloquearEdicaoChamada.set(true);
  }

  readonly totalPresentes = computed(
    () => this.alunos().filter((a) => a.statusPresenca === StatusPresenca.PRESENTE).length,
  );
  readonly totalFaltas = computed(
    () => this.alunos().filter((a) => a.statusPresenca === StatusPresenca.FALTA).length,
  );
  readonly totalFaltasJustificadas = computed(
    () => this.alunos().filter((a) => a.statusPresenca === StatusPresenca.FALTA_JUSTIFICADA).length,
  );

  ngOnInit(): void {
    const aulaId = Number(this.route.snapshot.paramMap.get('aulaId'));
    if (!aulaId) {
      this.erro.set('Aula não encontrada.');
      this.carregando.set(false);
      return;
    }
    this.carregarTudo(aulaId);
  }

  selecionarAba(aba: AbaAulaCompleta): void {
    this.aba.set(aba);
  }

  voltar(): void {
    this.location.back();
  }

  /**
   * Busca a aula (via /api/aulas/{id} pro básico, depois estreita a busca
   * de detalhes ao dia certo da turma em vez de trazer o histórico inteiro
   * dela) e o roster de presença (fonte única — ver ChamadaService).
   */
  private async carregarTudo(aulaId: number): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    this.desbloquearEdicaoChamada.set(false);
    try {
      const aulaBasica = await firstValueFrom(
        this.http.get<AulaResponseDTO>(`${this.api}/api/aulas/${aulaId}`),
      );
      if (!aulaBasica.turmaId) {
        throw new Error('Aula sem turma vinculada.');
      }

      const [aulasDoDia, alunos] = await Promise.all([
        firstValueFrom(
          this.aulaService.listarComDetalhes({
            turmaId: aulaBasica.turmaId,
            dataAula: aulaBasica.dataAula,
          }),
        ),
        this.chamadaService.carregarRoster(aulaId),
      ]);

      const aulaDetalhada = aulasDoDia.find((a) => a.aulaId === aulaId) ?? null;
      if (!aulaDetalhada) {
        throw new Error('Aula não encontrada nesta turma.');
      }

      this.aula.set(aulaDetalhada);
      this.alunos.set(alunos);
    } catch {
      this.erro.set('Não foi possível carregar os dados desta aula.');
    } finally {
      this.carregando.set(false);
    }
  }

  marcarPresenca(aluno: LinhaChamada, status: StatusPresenca): void {
    if (this.edicaoBloqueada()) return;
    this.alunos.set(marcarPresencaUtil(this.alunos(), aluno.assistidoId, status));
  }

  atualizarMotivoFalta(aluno: LinhaChamada, motivo: MotivoFalta): void {
    if (this.edicaoBloqueada()) return;
    this.alunos.set(atualizarMotivoFaltaUtil(this.alunos(), aluno.assistidoId, motivo));
  }

  atualizarObservacaoFalta(aluno: LinhaChamada, observacao: string): void {
    if (this.edicaoBloqueada()) return;
    this.alunos.set(atualizarObservacaoFaltaUtil(this.alunos(), aluno.assistidoId, observacao));
  }

  marcarTodosPresentes(): void {
    if (this.edicaoBloqueada()) return;
    this.alunos.set(marcarTodosPresentesUtil(this.alunos()));
  }

  async salvarChamada(): Promise<void> {
    const aula = this.aula();
    if (!aula || this.salvando() || this.edicaoBloqueada()) return;

    const erroValidacao = validarChamada(this.alunos());
    if (erroValidacao) {
      this.erro.set(erroValidacao);
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    this.salvo.set(false);
    try {
      const statusAula = await this.chamadaService.salvar(aula.aulaId, aula.statusAula, this.alunos());
      this.aula.set({ ...aula, statusAula });
      this.salvo.set(true);
    } catch {
      this.erro.set('Não foi possível salvar a chamada. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  podeExcluirMaterial(arq: ArquivoResponseDTO): boolean {
    return this.perfil() === Role.OFICINEIRO && arq.enviadoPorId === this.meuUsuarioId();
  }

  private async carregarMateriais(): Promise<void> {
    if (!this.aulaId) return;
    this.carregandoMateriais.set(true);
    try {
      this.materiais.set(
        await this.arquivoService.listar(EntidadeArquivo.AULA, this.aulaId, CategoriaArquivo.MATERIAL_AULA),
      );
    } catch {
      this.erroMaterial.set('Não foi possível carregar os materiais desta aula.');
    } finally {
      this.carregandoMateriais.set(false);
    }
  }

  /** URL assinada gerada no clique; a aba abre já no clique pra não cair no bloqueador de pop-up. */
  async abrirMaterial(arq: ArquivoResponseDTO): Promise<void> {
    const novaJanela = window.open('', '_blank');
    if (novaJanela) novaJanela.opener = null;
    this.abrindoMaterialId.set(arq.arquivoId);
    try {
      const { url } = await this.arquivoService.gerarUrl(arq.arquivoId);
      if (novaJanela) novaJanela.location.href = url;
      else window.location.href = url;
    } catch {
      novaJanela?.close();
      this.erroMaterial.set('Não foi possível abrir o material.');
    } finally {
      this.abrindoMaterialId.set(null);
    }
  }

  async excluirMaterial(arq: ArquivoResponseDTO): Promise<void> {
    if (this.confirmandoExclusaoId() !== arq.arquivoId) {
      this.confirmandoExclusaoId.set(arq.arquivoId);
      return;
    }
    this.confirmandoExclusaoId.set(null);
    this.excluindoMaterialId.set(arq.arquivoId);
    this.erroMaterial.set(null);
    try {
      await this.arquivoService.remover(arq.arquivoId); // exclusão lógica; a lista recarrega sozinha
    } catch (e) {
      this.erroMaterial.set(
        e instanceof HttpErrorResponse
          ? mensagemErro(e, 'Não foi possível excluir o material.')
          : 'Não foi possível excluir o material.',
      );
    } finally {
      this.excluindoMaterialId.set(null);
    }
  }

  tamanhoLegivel(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  }

  /** Disparado pelo <input type="file"> escondido da aba Materiais. */
  async enviarMaterial(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = ''; // deixa escolher o mesmo arquivo de novo depois
    if (!arquivo || !this.aulaId) return;

    // Checagem rápida só pra dar retorno na hora — quem decide de verdade é o back.
    if (!this.tiposMaterialAceitos.includes(arquivo.type)) {
      this.erroMaterial.set('Tipo de arquivo não permitido. Envie um PDF.');
      return;
    }
    if (arquivo.size > this.tamanhoMaximoMaterialBytes) {
      this.erroMaterial.set('Arquivo muito grande. O limite é 2 MB.');
      return;
    }

    this.erroMaterial.set(null);
    this.enviandoMaterial.set(true);
    try {
      await this.arquivoService.enviar(EntidadeArquivo.AULA, this.aulaId, CategoriaArquivo.MATERIAL_AULA, arquivo);
    } catch (e) {
      this.erroMaterial.set(
        e instanceof HttpErrorResponse
          ? mensagemErro(e, 'Não foi possível enviar o material.')
          : 'Não foi possível enviar o material.',
      );
    } finally {
      this.enviandoMaterial.set(false);
    }
  }
}
