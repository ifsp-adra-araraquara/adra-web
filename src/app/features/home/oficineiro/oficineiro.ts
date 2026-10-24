import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AulaRequestDTO } from '../../../shared/models/aula/AulaRequestDTO';
import { AulaResponseDTO } from '../../../shared/models/aula/AulaResponseDTO';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { CriacaoAulasRequestDTO, DiaDaSemana } from '../../../shared/models/aula/CriacaoAulasRequestDTO';
import { OficineiroComunicadoDTO } from '../../../shared/models/oficineiro/OficineiroComunicadoDTO';
import { AulaArquivoDTO } from '../../../shared/models/arquivo/AulaArquivoDTO';
import { OficineiroTurmaDTO } from '../../../shared/models/oficineiro/OficineiroTurmaDTO';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { AuthService } from '../../../core/auth.service';
import { ArquivoService } from '../../../core/arquivo.service';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { AulasTurmaModal } from '../aulas-turma-modal/aulas-turma-modal';
import { AulaModal } from '../../../shared/components/aula-modal/aula-modal';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { calcularSituacaoAula, ehAulaDeHoje, podeAbrirAula, ROTULO_SITUACAO_AULA } from '../../../shared/utils/aula.util';
import { SituacaoAula } from '../../../shared/enum/SituacaoAula';
import { ocupacaoTurma as ocupacaoTurmaUtil } from '../../../shared/utils/ocupacao.util';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Badge } from '../../../shared/components/badge/badge';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { Modal } from '../../../shared/components/modal/modal';
import { CalendarioAulas } from '../calendario-aulas/calendario-aulas';
import { Icon } from '../../../shared/components/icon/icon';
import { TooltipDirective } from '../../../shared/components/tooltip/tooltip';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

type AbaOficineiro = 'turmas' | 'aulas' | 'calendario' | 'materiais' | 'comunicados';

@Component({
  selector: 'app-oficineiro',
  imports: [TooltipDirective, Icon, FormsModule, AulasTurmaModal, AulaModal, Select, Badge, Input, Button, Modal, CalendarioAulas],
  templateUrl: './oficineiro.html',
  styleUrl: './oficineiro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Oficineiro implements OnInit {
  readonly turmaAulasSelecionada = signal<OficineiroTurmaDTO | null>(null);
  readonly aulaAberta = signal<AulaComDetalhesResponseDTO | null>(null);

  abrirAula(aula: AulaComDetalhesResponseDTO): void {
    if (!this.podeAbrir(aula)) return;
    this.aulaAberta.set(aula);
  }

  fecharAulaModal(): void {
    this.aulaAberta.set(null);
  }

  aoSalvarChamada(): void {
    this.carregarAulas();
  }

  podeAbrir(aula: AulaComDetalhesResponseDTO): boolean {
    return podeAbrirAula(aula.dataAula, aula.statusAula);
  }

  ehHoje(aula: AulaComDetalhesResponseDTO): boolean {
    return ehAulaDeHoje(aula.dataAula);
  }

  situacaoAula(aula: AulaComDetalhesResponseDTO) {
    return calcularSituacaoAula(aula.dataAula, aula.statusAula);
  }

  // ── Aba Aulas: aula de hoje, filtro por situação e paginação simples ─────
  private static readonly AULAS_POR_PAGINA = 15;
  readonly filtroSituacao = signal<SituacaoAula | null>(null);
  readonly limiteAulas = signal(Oficineiro.AULAS_POR_PAGINA);

  /** Aulas de hoje (todas as turmas do filtro), na ordem do horário. */
  readonly aulasDeHoje = computed(() =>
    this.aulas()
      .filter((a) => ehAulaDeHoje(a.dataAula))
      .sort((a, b) => (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? '')),
  );

  /** Sem aula hoje: a próxima não cancelada (pra mostrar "Próxima aula"). */
  readonly proximaAula = computed(() =>
    this.aulas()
      .filter((a) => this.situacaoAula(a) === SituacaoAula.PENDENTE)
      .sort((a, b) => a.dataAula.localeCompare(b.dataAula) || (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? ''))[0] ?? null,
  );

  /** Botões de filtro com a contagem de cada situação. */
  readonly opcoesSituacao = computed(() => {
    const contagem = new Map<SituacaoAula, number>();
    for (const a of this.aulas()) {
      const s = this.situacaoAula(a);
      contagem.set(s, (contagem.get(s) ?? 0) + 1);
    }
    return [
      { valor: null as SituacaoAula | null, rotulo: 'Todas', total: this.aulas().length },
      ...[SituacaoAula.DISPONIVEL, SituacaoAula.PENDENTE, SituacaoAula.FINALIZADA, SituacaoAula.CANCELADA].map((s) => ({
        valor: s as SituacaoAula | null,
        rotulo: ROTULO_SITUACAO_AULA[s],
        total: contagem.get(s) ?? 0,
      })),
    ];
  });

  readonly aulasFiltradas = computed(() => {
    const filtro = this.filtroSituacao();
    return filtro ? this.aulas().filter((a) => this.situacaoAula(a) === filtro) : this.aulas();
  });

  readonly aulasVisiveis = computed(() => this.aulasFiltradas().slice(0, this.limiteAulas()));

  selecionarSituacao(situacao: SituacaoAula | null): void {
    this.filtroSituacao.set(situacao);
    this.limiteAulas.set(Oficineiro.AULAS_POR_PAGINA);
  }

  mostrarMaisAulas(): void {
    this.limiteAulas.update((n) => n + Oficineiro.AULAS_POR_PAGINA);
  }

  /** "2026-10-23" -> "23/10" ; com ano quando não é o ano atual. */
  dataCurta(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return ano === String(new Date().getFullYear()) ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
  }

  horario(aula: AulaComDetalhesResponseDTO): string {
    const ini = aula.horarioInicio?.slice(0, 5);
    const fim = aula.horarioFim?.slice(0, 5);
    return ini && fim ? `${ini} – ${fim}` : ini ?? '-';
  }

  abrirAulasDaTurma(turma: OficineiroTurmaDTO): void {
    this.turmaAulasSelecionada.set(turma);
  }

  /** Ver `shared/utils/ocupacao.util.ts` — mesma conta reutilizada em `turma.ts`. */
  ocupacaoTurma(turma: OficineiroTurmaDTO): number {
    return ocupacaoTurmaUtil(turma.quantidadeAlunos, turma.capacidade);
  }

  fecharAulasDaTurma(): void {
    this.turmaAulasSelecionada.set(null);
  }

  /** Aba "Calendário" — mesmo calendário do coordenador, mas só com as turmas do oficineiro. */
  readonly turmaIdsPermitidos = computed<number[]>(() => this.turmas().map((t) => t.turmaId));

  readonly turmasFiltroOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Todas as turmas' },
    ...this.turmas().map((turma) => ({
      value: turma.turmaId,
      label: turma.nomeOficina ? `${turma.nomeTurma} — ${turma.nomeOficina}` : turma.nomeTurma,
    })),
  ]);

  readonly turmasFormOptions = computed<SelectOption<number>[]>(() => [
    { value: 0, label: 'Selecione' },
    ...this.turmas().map((turma) => ({ value: turma.turmaId, label: turma.nomeTurma })),
  ]);

  statusAulaOptions: SelectOption<string | undefined>[] = [
    { value: undefined, label: 'Planejada' },
    { value: 'REALIZADA', label: 'Realizada' },
    { value: 'CANCELADA', label: 'Cancelada' },
  ];
  
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly arquivoService = inject(ArquivoService);
  private readonly api = environment.apiUrl;

  readonly aba = signal<AbaOficineiro>('turmas');
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly turmas = signal<OficineiroTurmaDTO[]>([]);
  /** Só pra popular o filtro "Oficina" do calendário — GET /api/oficinas/minhas-oficinas/{id}. */
  readonly oficinasProprias = signal<OficinaResponseDTO[]>([]);
  readonly aulas = signal<AulaComDetalhesResponseDTO[]>([]);
  readonly filtroTurmaId = signal<number | null>(null);
  /** Aba Materiais: aulas com material, de todas as turmas do oficineiro (ou da turma filtrada). */
  readonly materiais = signal<AulaArquivoDTO[]>([]);
  readonly filtroTurmaMateriais = signal<number | null>(null);
  readonly abrindoArquivoId = signal<number | null>(null);
  /** Exclusão em dois cliques: 1º marca, 2º confirma. */
  readonly confirmandoExclusaoId = signal<number | null>(null);
  readonly excluindoArquivoId = signal<number | null>(null);
  readonly comunicados = signal<OficineiroComunicadoDTO[]>([]);
  readonly turmaSelecionada = signal<OficineiroTurmaDTO | null>(null);
  readonly mostrarAlunos = signal(false);
  readonly alunos = signal<{ assistidoId: number; nomeCompleto: string }[]>([]);
  readonly mostrarFormularioAula = signal(false);
  readonly salvandoAula = signal(false);
  readonly aulaEmEdicao = signal<number | null>(null);
  readonly mostrarUploadMaterial = signal(false);
  readonly enviandoMaterial = signal(false);
  readonly arquivoMaterial = signal<File | null>(null);
  // Modal "Novo material": turma -> aula -> arquivo (o material fica vinculado à aula).
  readonly materialTurmaId = signal<number | null>(null);
  readonly materialAulaId = signal<number | null>(null);
  readonly aulasDaTurmaMaterial = signal<AulaComDetalhesResponseDTO[]>([]);
  readonly carregandoAulasMaterial = signal(false);
  readonly erroMaterial = signal<string | null>(null);
  readonly sucessoMaterial = signal<string | null>(null);
  /** Espelha CategoriaArquivo.MATERIAL_AULA do back — mudou lá, mude aqui. */
  readonly tiposMaterialAceitos = ['application/pdf'];
  readonly tamanhoMaximoMaterialBytes = 2 * 1024 * 1024;

  readonly turmasMaterialOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Selecione a turma', disabled: true },
    ...this.turmas().map((t) => ({ value: t.turmaId, label: t.nomeTurma })),
  ]);
  readonly aulasMaterialOptions = computed<SelectOption<number | null>[]>(() => {
    const aulas = this.aulasDaTurmaMaterial();
    const vazio = this.carregandoAulasMaterial()
      ? 'Carregando aulas...'
      : !this.materialTurmaId()
        ? 'Escolha a turma primeiro'
        : aulas.length ? 'Selecione a aula' : 'Nenhuma aula nesta turma';
    return [
      { value: null, label: vazio, disabled: true },
      ...aulas.map((a) => ({ value: a.aulaId, label: this.rotuloAula(a) })),
    ];
  });
  readonly podeEnviarMaterial = computed(
    () => !!this.materialAulaId() && !!this.arquivoMaterial() && !this.enviandoMaterial(),
  );
  readonly mostrarModalCriarAulas = signal(false);
  readonly salvandoCriarAulas = signal(false);
  readonly erroCriarAulas = signal<string | null>(null);
  formCriarAulas: CriacaoAulasRequestDTO = {
    turmaId: 0,
    dataInicio: '',
    dataFim: '',
    diasDaSemana: [],
    horarioInicio: '',
    horarioFim: '',
    titulo: '',
    descricao: '',
    conteudoPrevisto: '',
    objetivos: '',
    recursosNecessarios: '',
    observacoes: '',
  };
  readonly aulaForm: AulaRequestDTO = {
    turmaId: 0,
    dataAula: '',
    titulo: '',
    descricao: '',
    horarioInicio: '',
    horarioFim: '',
    conteudoPrevisto: '',
    conteudoMinistrado: '',
    objetivos: '',
    recursosNecessarios: '',
    statusAula: undefined,
    observacoes: '',
  };

  
  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const aba = params.get('aba');
      if (this.ehAba(aba)) {
        this.aba.set(aba);
      }
      this.carregarAba(this.aba());
    });
  }

  selecionarAba(aba: AbaOficineiro): void {
    this.aba.set(aba);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba },
      queryParamsHandling: 'merge',
    });
    this.carregarAba(aba);
  }

  abrirTurma(turma: OficineiroTurmaDTO): void {
    this.turmaSelecionada.set(turma);
    this.mostrarAlunos.set(true);
    this.http
      .get<PaginaResponse<AssistidoResponseDTO>>(`${this.api}/api/assistidos`, {
        params: { turmaId: turma.turmaId.toString(), status: 'ATIVO', tamanho: '200' },
      })
      .subscribe({
        next: (pagina) =>
          this.alunos.set(
            pagina.conteudo.map((a) => ({
              assistidoId: a.assistidoId,
              nomeCompleto: a.nomeCompleto,
            })),
          ),
        error: () => this.erro.set('Não foi possível carregar os alunos da turma.'),
      });
  }

  fecharTurma(): void {
    this.mostrarAlunos.set(false);
    this.turmaSelecionada.set(null);
    this.alunos.set([]);
  }

  async onFiltroTurmaChange(valor: number | string | null): Promise<void> {
    const turmaId = valor ? Number(valor) : null;
    this.filtroTurmaId.set(turmaId);
    this.limiteAulas.set(Oficineiro.AULAS_POR_PAGINA);
    this.carregando.set(true);
    this.erro.set(null);
    try {
      await this.carregarAulas();
    } catch {
      this.erro.set('Não foi possível carregar as aulas desta turma.');
    } finally {
      this.carregando.set(false);
    }
  }

  abrirNovaAula(): void {
    this.aulaEmEdicao.set(null);
    this.aulaForm.turmaId = this.filtroTurmaId() ?? this.turmas()[0]?.turmaId ?? 0;
    this.aulaForm.dataAula = new Date().toISOString().slice(0, 10);
    this.aulaForm.titulo = '';
    this.aulaForm.descricao = '';
    this.aulaForm.horarioInicio = '';
    this.aulaForm.horarioFim = '';
    this.aulaForm.conteudoPrevisto = '';
    this.aulaForm.conteudoMinistrado = '';
    this.aulaForm.objetivos = '';
    this.aulaForm.recursosNecessarios = '';
    this.aulaForm.statusAula = undefined;
    this.aulaForm.observacoes = '';
    this.mostrarFormularioAula.set(true);
  }

  editarAula(aula: AulaComDetalhesResponseDTO): void {
    this.aulaEmEdicao.set(aula.aulaId);
    this.aulaForm.turmaId = aula.turmaId ?? 0;
    this.aulaForm.dataAula = aula.dataAula;
    this.aulaForm.titulo = aula.titulo ?? '';
    this.aulaForm.descricao = aula.descricao ?? '';
    this.aulaForm.horarioInicio = aula.horarioInicio ?? '';
    this.aulaForm.horarioFim = aula.horarioFim ?? '';
    this.aulaForm.conteudoPrevisto = aula.conteudoPrevisto ?? '';
    this.aulaForm.conteudoMinistrado = aula.conteudoMinistrado ?? '';
    this.aulaForm.objetivos = aula.objetivos ?? '';
    this.aulaForm.recursosNecessarios = aula.recursosNecessarios ?? '';
    this.aulaForm.statusAula = aula.statusAula;
    this.aulaForm.observacoes = aula.observacoes ?? '';
    this.mostrarFormularioAula.set(true);
  }

  fecharFormularioAula(): void {
    this.mostrarFormularioAula.set(false);
    this.aulaEmEdicao.set(null);
  }

  async salvarAula(): Promise<void> {
    if (!this.aulaForm.turmaId || !this.aulaForm.dataAula || this.salvandoAula()) return;
    this.salvandoAula.set(true);
    this.erro.set(null);
    try {
      const aulaId = this.aulaEmEdicao();
      if (aulaId) {
        await firstValueFrom(
          this.http.put<AulaResponseDTO>(`${this.api}/api/aulas/${aulaId}`, this.aulaForm),
        );
      } else {
        await firstValueFrom(
          this.http.post<AulaResponseDTO>(`${this.api}/api/aulas`, this.aulaForm),
        );
      }
      this.fecharFormularioAula();
      await this.carregarAulas();
    } catch {
      this.erro.set('Não foi possível salvar a aula.');
    } finally {
      this.salvandoAula.set(false);
    }
  }

  /** Abre o modal limpo. Garante a lista de turmas (a aba Materiais não carrega turmas). */
  async abrirUploadMaterial(): Promise<void> {
    this.materialTurmaId.set(null);
    this.materialAulaId.set(null);
    this.aulasDaTurmaMaterial.set([]);
    this.arquivoMaterial.set(null);
    this.erroMaterial.set(null);
    this.sucessoMaterial.set(null);
    this.mostrarUploadMaterial.set(true);
    if (!this.turmas().length) {
      try {
        await this.carregarTurmas();
      } catch {
        this.erroMaterial.set('Não foi possível carregar suas turmas.');
      }
    }
  }

  fecharUploadMaterial(): void {
    this.mostrarUploadMaterial.set(false);
  }

  /** Trocou a turma: limpa a aula escolhida e busca as aulas dessa turma. */
  async selecionarTurmaMaterial(turmaId: number | null): Promise<void> {
    this.materialTurmaId.set(turmaId);
    this.materialAulaId.set(null);
    this.aulasDaTurmaMaterial.set([]);
    if (!turmaId) return;
    this.carregandoAulasMaterial.set(true);
    try {
      const aulas = await firstValueFrom(
        this.http.get<AulaComDetalhesResponseDTO[]>(`${this.api}/api/aulas/turma/${turmaId}/detalhes`),
      );
      if (this.materialTurmaId() !== turmaId) return; // trocou de turma no meio da busca
      this.aulasDaTurmaMaterial.set(
        [...aulas].sort(
          (a, b) => b.dataAula.localeCompare(a.dataAula) || (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? ''),
        ),
      );
    } catch {
      this.erroMaterial.set('Não foi possível carregar as aulas desta turma.');
    } finally {
      this.carregandoAulasMaterial.set(false);
    }
  }

  selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    this.erroMaterial.set(null);
    if (!arquivo) {
      this.arquivoMaterial.set(null);
      return;
    }
    // Checagem rápida só pra dar retorno na hora — quem decide de verdade é o back.
    if (!this.tiposMaterialAceitos.includes(arquivo.type)) {
      this.erroMaterial.set('Tipo de arquivo não permitido. Envie um PDF.');
    } else if (arquivo.size > this.tamanhoMaximoMaterialBytes) {
      this.erroMaterial.set('Arquivo muito grande. O limite é 2 MB.');
    } else {
      this.arquivoMaterial.set(arquivo);
      return;
    }
    this.arquivoMaterial.set(null);
    input.value = '';
  }

  /** POST /api/arquivos com dono AULA — o back confere se a aula é de turma deste oficineiro. */
  async enviarMaterial(): Promise<void> {
    const arquivo = this.arquivoMaterial();
    const aulaId = this.materialAulaId();
    if (!aulaId) {
      this.erroMaterial.set('Escolha a aula para vincular o material.');
      return;
    }
    if (!arquivo || this.enviandoMaterial()) return;
    this.enviandoMaterial.set(true);
    this.erroMaterial.set(null);
    try {
      await this.arquivoService.enviar(EntidadeArquivo.AULA, aulaId, CategoriaArquivo.MATERIAL_AULA, arquivo);
      const aula = this.aulasDaTurmaMaterial().find((a) => a.aulaId === aulaId);
      this.sucessoMaterial.set(`Material enviado para a aula ${aula ? this.rotuloAula(aula) : ''}.`);
      this.mostrarUploadMaterial.set(false);
      this.arquivoMaterial.set(null);
      await this.carregarMateriais();
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

  async onFiltroTurmaMateriaisChange(turmaId: number | null): Promise<void> {
    this.filtroTurmaMateriais.set(turmaId);
    this.erro.set(null);
    try {
      await this.carregarMateriais();
    } catch {
      this.erro.set('Não foi possível carregar os materiais.');
    }
  }

  /**
   * URL assinada e temporária, gerada no clique. A aba abre JÁ no clique (senão o
   * bloqueador de pop-up barra) e só depois recebe a URL — mesmo truque do lista-documentos.
   */
  async abrirMaterial(arquivoId: number): Promise<void> {
    const novaJanela = window.open('', '_blank');
    if (novaJanela) novaJanela.opener = null;
    this.abrindoArquivoId.set(arquivoId);
    try {
      const { url } = await this.arquivoService.gerarUrl(arquivoId);
      if (novaJanela) novaJanela.location.href = url;
      else window.location.href = url;
    } catch {
      novaJanela?.close();
      this.erro.set('Não foi possível abrir o material.');
    } finally {
      this.abrindoArquivoId.set(null);
    }
  }

  /** Exclusão lógica (excluido_em). O back só deixa o oficineiro excluir o que ELE enviou. */
  async excluirMaterial(arquivoId: number): Promise<void> {
    if (this.confirmandoExclusaoId() !== arquivoId) {
      this.confirmandoExclusaoId.set(arquivoId);
      return;
    }
    this.confirmandoExclusaoId.set(null);
    this.excluindoArquivoId.set(arquivoId);
    this.erro.set(null);
    this.sucessoMaterial.set(null);
    try {
      await this.arquivoService.remover(arquivoId);
      await this.carregarMateriais();
    } catch (e) {
      this.erro.set(
        e instanceof HttpErrorResponse
          ? mensagemErro(e, 'Não foi possível excluir o material.')
          : 'Não foi possível excluir o material.',
      );
    } finally {
      this.excluindoArquivoId.set(null);
    }
  }

  /** "2026-10-15" -> "15/10/2026" */
  dataBr(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  situacaoAulaMaterial(aula: AulaArquivoDTO) {
    return calcularSituacaoAula(aula.dataAula, aula.statusAula);
  }

  /** "15/10/2026 · 07:00 – Aulas futebol" */
  rotuloAula(aula: AulaComDetalhesResponseDTO): string {
    const [ano, mes, dia] = aula.dataAula.split('-');
    const hora = aula.horarioInicio ? ` · ${aula.horarioInicio.slice(0, 5)}` : '';
    const titulo = aula.titulo?.trim() ? ` – ${aula.titulo.trim()}` : '';
    return `${dia}/${mes}/${ano}${hora}${titulo}`;
  }

  tamanhoLegivel(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  }

  private async carregarAba(aba: AbaOficineiro): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      if (aba === 'turmas') await this.carregarTurmas();
      if (aba === 'aulas') await this.carregarAulas();
      if (aba === 'calendario') await Promise.all([this.carregarTurmas(), this.carregarOficinasProprias()]);
      if (aba === 'materiais') await this.carregarMateriais();
      if (aba === 'comunicados') await this.carregarComunicados();
    } catch {
      this.erro.set('Não foi possível carregar esta área.');
    } finally {
      this.carregando.set(false);
    }
  }

  private async carregarTurmas(): Promise<void> {
    const usuario = this.usuarioLogado();
    if (!usuario) return;
    const turmas = await firstValueFrom(
      this.http.get<OficineiroTurmaDTO[]>(
        `${this.api}/api/turmas/minhas-turmas/${usuario.usuarioId}`,
      ),
    );
    this.turmas.set(turmas);
  }

  /** Filtro "Oficina" da aba Calendário — só as oficinas do próprio oficineiro. */
  private async carregarOficinasProprias(): Promise<void> {
    const usuario = this.usuarioLogado();
    if (!usuario) return;
    const oficinas = await firstValueFrom(
      this.http.get<OficinaResponseDTO[]>(
        `${this.api}/api/oficinas/minhas-oficinas/${usuario.usuarioId}`,
      ),
    );
    this.oficinasProprias.set(oficinas);
  }

  private async carregarAulas(): Promise<void> {
    await this.carregarTurmas();

    const turmaId = this.filtroTurmaId();
    if (turmaId) {
      const aulas = await firstValueFrom(
        this.http.get<AulaComDetalhesResponseDTO[]>(
          `${this.api}/api/aulas/turma/${turmaId}/detalhes`,
        ),
      );
      this.aulas.set([...aulas].sort((a, b) => b.dataAula.localeCompare(a.dataAula) || (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? '')));
      return;
    }

    const aulas = await Promise.all(
      this.turmas().map((turma) =>
        firstValueFrom(
          this.http.get<AulaComDetalhesResponseDTO[]>(
            `${this.api}/api/aulas/turma/${turma.turmaId}/detalhes`,
          ),
        ),
      ),
    );
    this.aulas.set(aulas.flat().sort((a, b) => b.dataAula.localeCompare(a.dataAula) || (a.horarioInicio ?? '').localeCompare(b.horarioInicio ?? '')));
  }

  /** Uma chamada por turma do oficineiro (ou só a do filtro); junta e ordena da aula mais recente. */
  private async carregarMateriais(): Promise<void> {
    if (!this.turmas().length) await this.carregarTurmas();
    const filtro = this.filtroTurmaMateriais();
    const turmaIds = filtro ? [filtro] : this.turmas().map((t) => t.turmaId);
    const porTurma = await Promise.all(turmaIds.map((id) => this.arquivoService.listarMateriaisPorTurma(id)));
    this.materiais.set(porTurma.flat().sort((a, b) => b.dataAula.localeCompare(a.dataAula)));
  }

  private async carregarComunicados(): Promise<void> {
    const comunicados = await firstValueFrom(
      this.http.get<OficineiroComunicadoDTO[]>(`${this.api}/api/comunicados/minhas-turmas`),
    );
    this.comunicados.set(comunicados);
  }

  private usuarioLogado() {
    return this.auth.currentUserResponse();
  }

  private ehAba(valor: string | null): valor is AbaOficineiro {
    return (
      valor === 'turmas' ||
      valor === 'aulas' ||
      valor === 'calendario' ||
      valor === 'materiais' ||
      valor === 'comunicados'
    );
  }

  /* ============================================================
   * CRIAR VÁRIAS AULAS
   * ============================================================ */
  abrirModalCriarAulas(): void {
    this.formCriarAulas = {
      turmaId: this.turmas()[0]?.turmaId ?? 0,
      dataInicio: '',
      dataFim: '',
      diasDaSemana: [],
      horarioInicio: '',
      horarioFim: '',
      titulo: '',
      descricao: '',
      conteudoPrevisto: '',
      objetivos: '',
      recursosNecessarios: '',
      observacoes: '',
    };
    this.erroCriarAulas.set(null);
    this.mostrarModalCriarAulas.set(true);
  }

  fecharModalCriarAulas(): void {
    this.mostrarModalCriarAulas.set(false);
  }

  atualizarCampoCriarAulas(campo: keyof CriacaoAulasRequestDTO, valor: any): void {
    this.formCriarAulas = { ...this.formCriarAulas, [campo]: valor };
  }

  toggleDiaSemana(dia: DiaDaSemana): void {
    const dias = this.formCriarAulas.diasDaSemana;
    const index = dias.indexOf(dia);
    if (index > -1) {
      this.formCriarAulas.diasDaSemana = dias.filter((d) => d !== dia);
    } else {
      this.formCriarAulas.diasDaSemana = [...dias, dia];
    }
  }

  async salvarCriarAulas(): Promise<void> {
    if (this.salvandoCriarAulas()) {
      return;
    }

    if (!this.formCriarAulas.turmaId) {
      this.erroCriarAulas.set('Selecione uma turma.');
      return;
    }

    if (!this.formCriarAulas.dataInicio) {
      this.erroCriarAulas.set('Informe a data de início.');
      return;
    }

    if (!this.formCriarAulas.dataFim) {
      this.erroCriarAulas.set('Informe a data de fim.');
      return;
    }

    if (!this.formCriarAulas.diasDaSemana || this.formCriarAulas.diasDaSemana.length === 0) {
      this.erroCriarAulas.set('Selecione pelo menos um dia da semana.');
      return;
    }

    if (!this.formCriarAulas.horarioInicio) {
      this.erroCriarAulas.set('Informe o horário de início.');
      return;
    }

    if (!this.formCriarAulas.horarioFim) {
      this.erroCriarAulas.set('Informe o horário de fim.');
      return;
    }

    this.salvandoCriarAulas.set(true);
    this.erroCriarAulas.set(null);

    try {
      const criouAlgumaAula = await firstValueFrom(
        this.http.post<boolean>(`${this.api}/api/aulas/varias-aulas`, this.formCriarAulas),
      );
      this.salvandoCriarAulas.set(false);

      if (!criouAlgumaAula) {
        this.erroCriarAulas.set(
          'Nenhuma aula foi criada: nenhuma data no período informado cai nos dias da semana ' +
            'escolhidos (ou as aulas dessas datas já existiam para esta turma).',
        );
        return;
      }

      this.fecharModalCriarAulas();
      await this.carregarAulas();
    } catch (erro: any) {
      console.error('Erro ao criar aulas:', erro);
      this.erroCriarAulas.set(
        mensagemErro(erro, 'Não foi possível criar as aulas. Verifique os dados e tente novamente.'),
      );
      this.salvandoCriarAulas.set(false);
    }
  }
}
