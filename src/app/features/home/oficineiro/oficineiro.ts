import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AulaComDetalhesResponseDTO } from '../../../shared/models/aula/AulaComDetalhesResponseDTO';
import { OficineiroComunicadoDTO } from '../../../shared/models/oficineiro/OficineiroComunicadoDTO';
import { AulaArquivoDTO } from '../../../shared/models/arquivo/AulaArquivoDTO';
import { OficineiroTurmaDTO } from '../../../shared/models/oficineiro/OficineiroTurmaDTO';
import { AuthService } from '../../../core/auth.service';
import { ArquivoService } from '../../../core/arquivo.service';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { calcularSituacaoAula } from '../../../shared/utils/aula.util';
import { ocupacaoTurma as ocupacaoTurmaUtil } from '../../../shared/utils/ocupacao.util';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Badge } from '../../../shared/components/badge/badge';
import { Button } from '../../../shared/components/button/button';
import { Modal } from '../../../shared/components/modal/modal';
import { CalendarioAulas } from '../calendario-aulas/calendario-aulas';
import { Icon } from '../../../shared/components/icon/icon';
import { TooltipDirective } from '../../../shared/components/tooltip/tooltip';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

type AbaOficineiro = 'turmas' | 'calendario' | 'materiais' | 'comunicados';

@Component({
  selector: 'app-oficineiro',
  imports: [TooltipDirective, Icon, FormsModule, Select, Badge, Button, Modal, CalendarioAulas],
  templateUrl: './oficineiro.html',
  styleUrl: './oficineiro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Oficineiro implements OnInit {
  /** Ver `shared/utils/ocupacao.util.ts` — mesma conta reutilizada em `turma.ts`. */
  ocupacaoTurma(turma: OficineiroTurmaDTO): number {
    return ocupacaoTurmaUtil(turma.quantidadeAlunos, turma.capacidade);
  }

  readonly turmasFiltroOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Todas as turmas' },
    ...this.turmas().map((turma) => ({
      value: turma.turmaId,
      label: turma.nomeOficina ? `${turma.nomeTurma} — ${turma.nomeOficina}` : turma.nomeTurma,
    })),
  ]);

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
      valor === 'calendario' ||
      valor === 'materiais' ||
      valor === 'comunicados'
    );
  }

}
