import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AulaRequestDTO } from '../../../shared/models/aula/AulaRequestDTO';
import { AulaResponseDTO } from '../../../shared/models/aula/AulaResponseDTO';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { CriacaoAulasRequestDTO, DiaDaSemana } from '../../../shared/models/aula/CriacaoAulasRequestDTO';
import { OficineiroComunicadoDTO } from '../../../shared/models/oficineiro/OficineiroComunicadoDTO';
import { OficineiroMaterialDTO } from '../../../shared/models/oficineiro/OficineiroMaterialDTO';
import { OficineiroTurmaDTO } from '../../../shared/models/oficineiro/OficineiroTurmaDTO';
import { AuthService } from '../../../core/auth.service';
import { AulasTurmaModal } from '../aulas-turma-modal/aulas-turma-modal';
import { AulaModal } from '../../../shared/components/aula-modal/aula-modal';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { calcularSituacaoAula, ehAulaDeHoje, podeAbrirAula } from '../../../shared/utils/aula.util';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Badge } from '../../../shared/components/badge/badge';
import { Input } from '../../../shared/components/input/input';
import { Button } from '../../../shared/components/button/button';
import { Modal } from '../../../shared/components/modal/modal';

type AbaOficineiro = 'turmas' | 'aulas' | 'materiais' | 'comunicados';

@Component({
  selector: 'app-oficineiro',
  imports: [FormsModule, AulasTurmaModal, AulaModal, Select, Badge, Input, Button, Modal],
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

  abrirAulasDaTurma(turma: OficineiroTurmaDTO): void {
    this.turmaAulasSelecionada.set(turma);
  }

  fecharAulasDaTurma(): void {
    this.turmaAulasSelecionada.set(null);
  }

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
  private readonly api = environment.apiUrl;

  readonly aba = signal<AbaOficineiro>('turmas');
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly turmas = signal<OficineiroTurmaDTO[]>([]);
  readonly aulas = signal<AulaComDetalhesResponseDTO[]>([]);
  readonly filtroTurmaId = signal<number | null>(null);
  readonly materiais = signal<OficineiroMaterialDTO[]>([]);
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

  selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.arquivoMaterial.set(input.files?.[0] ?? null);
  }

  async enviarMaterial(): Promise<void> {
    const arquivo = this.arquivoMaterial();
    if (!arquivo || this.enviandoMaterial()) return;
    this.enviandoMaterial.set(true);
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    try {
      await firstValueFrom(this.http.post(`${this.api}/api/materiais`, dados));
      this.mostrarUploadMaterial.set(false);
      this.arquivoMaterial.set(null);
      await this.carregarMateriais();
    } catch {
      this.erro.set('Não foi possível enviar o material.');
    } finally {
      this.enviandoMaterial.set(false);
    }
  }

  private async carregarAba(aba: AbaOficineiro): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      if (aba === 'turmas') await this.carregarTurmas();
      if (aba === 'aulas') await this.carregarAulas();
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

  private async carregarAulas(): Promise<void> {
    await this.carregarTurmas();

    const turmaId = this.filtroTurmaId();
    if (turmaId) {
      const aulas = await firstValueFrom(
        this.http.get<AulaComDetalhesResponseDTO[]>(
          `${this.api}/api/aulas/turma/${turmaId}/detalhes`,
        ),
      );
      this.aulas.set([...aulas].sort((a, b) => b.dataAula.localeCompare(a.dataAula)));
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
    this.aulas.set(aulas.flat().sort((a, b) => b.dataAula.localeCompare(a.dataAula)));
  }

  private async carregarMateriais(): Promise<void> {
    const materiais = await firstValueFrom(
      this.http.get<OficineiroMaterialDTO[]>(`${this.api}/api/materiais/minhas-turmas`),
    );
    this.materiais.set(materiais);
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
      valor === 'turmas' || valor === 'aulas' || valor === 'materiais' || valor === 'comunicados'
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
        erro?.error?.message ??
          'Não foi possível criar as aulas. Verifique os dados e tente novamente.',
      );
      this.salvandoCriarAulas.set(false);
    }
  }
}
