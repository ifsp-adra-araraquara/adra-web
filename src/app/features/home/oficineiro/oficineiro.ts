import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OficineiroComunicadoDTO } from '../../../shared/models/oficineiro/OficineiroComunicadoDTO';
import { OficineiroTurmaDTO } from '../../../shared/models/oficineiro/OficineiroTurmaDTO';
import { AuthService } from '../../../core/auth.service';
import { ArquivoService } from '../../../core/arquivo.service';
import { SemanarioService } from '../../../core/semanario.service';
import { SemanarioResponseDTO } from '../../../shared/models/semanario/SemanarioResponseDTO';
import { TabelaSemanarios } from '../../../shared/components/tabela-semanarios/tabela-semanarios';
import { OficinaResponseDTO } from '../../../shared/models/oficina/OficinaResponseDTO';
import { rotuloSemana, segundaDaSemana, semanasAoRedor } from '../../../shared/utils/semana.util';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { PaginaResponse } from '../../../shared/models/PaginaResponse';
import { AssistidoResponseDTO } from '../../../shared/models/assistido/AssistidoResponseDTO';
import { hojeISO } from '../../../shared/utils/aula.util';
import { ocupacaoTurma as ocupacaoTurmaUtil } from '../../../shared/utils/ocupacao.util';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Button } from '../../../shared/components/button/button';
import { Modal } from '../../../shared/components/modal/modal';
import { CalendarioAulas } from '../calendario-aulas/calendario-aulas';
import { Icon } from '../../../shared/components/icon/icon';
import { TooltipDirective } from '../../../shared/components/tooltip/tooltip';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

type AbaOficineiro = 'turmas' | 'calendario' | 'semanario' | 'comunicados';

@Component({
  selector: 'app-oficineiro',
  imports: [TooltipDirective, Icon, FormsModule, Select, Button, Modal, CalendarioAulas, TabelaSemanarios],
  templateUrl: './oficineiro.html',
  styleUrl: './oficineiro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Oficineiro implements OnInit {
  /** Ver `shared/utils/ocupacao.util.ts` — mesma conta reutilizada em `turma.ts`. */
  ocupacaoTurma(turma: OficineiroTurmaDTO): number {
    return ocupacaoTurmaUtil(turma.quantidadeAlunos, turma.capacidade);
  }

  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly arquivoService = inject(ArquivoService);
  private readonly semanarioService = inject(SemanarioService);
  private readonly api = environment.apiUrl;

  readonly aba = signal<AbaOficineiro>('turmas');
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly turmas = signal<OficineiroTurmaDTO[]>([]);
  /** Oficinas do oficineiro; as que ainda não atendem grupo também aparecem em "Minhas turmas". */
  readonly oficinas = signal<OficinaResponseDTO[]>([]);
  readonly oficinasSemGrupo = computed(() =>
    this.oficinas().filter((o) => o.ativo && !this.turmas().some((t) => t.oficinaId === o.oficinaId)),
  );
  readonly comunicados = signal<OficineiroComunicadoDTO[]>([]);
  readonly turmaSelecionada = signal<OficineiroTurmaDTO | null>(null);
  readonly mostrarAlunos = signal(false);
  readonly alunos = signal<{ assistidoId: number; nomeCompleto: string }[]>([]);
  /** Aba Semanário: os semanários das oficinas do oficineiro, o mais recente primeiro. */
  readonly semanarios = signal<SemanarioResponseDTO[]>([]);
  readonly sucessoSemanario = signal<string | null>(null);

  // Modal "Enviar semanário": grupo (oficina + grupo), semana, plano e um PDF opcional.
  readonly mostrarEnvioSemanario = signal(false);
  readonly enviandoSemanario = signal(false);
  readonly erroSemanario = signal<string | null>(null);
  readonly grupoSemanario = signal<string | null>(null);
  /** Segunda-feira da semana escolhida. */
  readonly semanaSemanario = signal(segundaDaSemana(hojeISO()));
  readonly conteudoPrevisto = signal('');
  readonly objetivos = signal('');
  readonly recursosNecessarios = signal('');
  readonly arquivoMaterial = signal<File | null>(null);
  /** Espelha CategoriaArquivo.MATERIAL_SEMANARIO do back — mudou lá, mude aqui. */
  readonly tiposMaterialAceitos = ['application/pdf'];
  readonly tamanhoMaximoMaterialBytes = 2 * 1024 * 1024;

  /** Cada linha de "Minhas turmas" é um grupo atendido por uma oficina; a chave junta os dois ids. */
  readonly gruposSemanarioOptions = computed<SelectOption<string | null>[]>(() => [
    { value: null, label: 'Selecione o grupo', disabled: true },
    ...this.turmas()
      .filter((t) => t.oficinaId != null)
      .map((t) => ({ value: this.chaveGrupo(t), label: `${t.nomeTurma} — ${t.nomeOficina}` })),
  ]);
  /** Grupo escolhido no modal (linha de "Minhas turmas"). */
  private readonly grupoEscolhido = computed(() =>
    this.turmas().find((t) => this.chaveGrupo(t) === this.grupoSemanario()) ?? null,
  );
  /** Semanários já enviados para o grupo escolhido. */
  private readonly semanariosDoGrupo = computed(() => {
    const grupo = this.grupoEscolhido();
    if (!grupo) return [];
    return this.semanarios().filter((s) => s.oficinaId === grupo.oficinaId && s.turmaId === grupo.turmaId);
  });
  /** Se já existe semanário do grupo na semana escolhida, enviar atualiza ele. */
  readonly semanarioExistente = computed(
    () => this.semanariosDoGrupo().find((s) => s.semanaInicio === this.semanaSemanario()) ?? null,
  );
  readonly semanasOptions = computed<SelectOption<string>[]>(() => {
    const atual = segundaDaSemana(hojeISO());
    const enviadas = new Set(this.semanariosDoGrupo().map((s) => s.semanaInicio));
    return semanasAoRedor(hojeISO(), 8, 4).map((segunda) => ({
      value: segunda,
      label:
        rotuloSemana(segunda) +
        (segunda === atual ? ' · esta semana' : '') +
        (enviadas.has(segunda) ? ' · já enviado' : ''),
    }));
  });
  readonly semanasJaEnviadas = computed(() => this.semanariosDoGrupo().map((s) => rotuloSemana(s.semanaInicio)));

  readonly podeEnviarSemanario = computed(
    () => !!this.grupoSemanario() && !!this.semanaSemanario() && !!this.conteudoPrevisto().trim() && !this.enviandoSemanario(),
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
        error: () => this.erro.set('Não foi possível carregar os atendidos do grupo.'),
      });
  }

  fecharTurma(): void {
    this.mostrarAlunos.set(false);
    this.turmaSelecionada.set(null);
    this.alunos.set([]);
  }

  /** Abre o modal limpo. Garante a lista de turmas (a aba Semanário não carrega turmas). */
  async abrirEnvioSemanario(): Promise<void> {
    this.grupoSemanario.set(null);
    this.semanaSemanario.set(segundaDaSemana(hojeISO()));
    this.conteudoPrevisto.set('');
    this.objetivos.set('');
    this.recursosNecessarios.set('');
    this.arquivoMaterial.set(null);
    this.erroSemanario.set(null);
    this.sucessoSemanario.set(null);
    this.mostrarEnvioSemanario.set(true);
    try {
      if (!this.turmas().length) await this.carregarTurmas();
      await this.carregarSemanarios();
    } catch {
      this.erroSemanario.set('Não foi possível carregar seus grupos.');
    }
  }

  escolherGrupoSemanario(chave: string | null): void {
    this.grupoSemanario.set(chave);
    this.preencherComSemanarioExistente();
  }

  escolherSemanaSemanario(segunda: string): void {
    this.semanaSemanario.set(segunda);
    this.preencherComSemanarioExistente();
  }

  /** Semana já enviada: traz o plano para editar, em vez de começar em branco. */
  private preencherComSemanarioExistente(): void {
    const existente = this.semanarioExistente();
    if (!existente) return;
    this.conteudoPrevisto.set(existente.conteudoPrevisto);
    this.objetivos.set(existente.objetivos ?? '');
    this.recursosNecessarios.set(existente.recursosNecessarios ?? '');
  }

  async removerSemanario(semanario: SemanarioResponseDTO): Promise<void> {
    this.erro.set(null);
    this.sucessoSemanario.set(null);
    try {
      await this.semanarioService.remover(semanario.semanarioId);
      this.semanarios.update((lista) => lista.filter((s) => s.semanarioId !== semanario.semanarioId));
    } catch (e) {
      this.erro.set(
        e instanceof HttpErrorResponse
          ? mensagemErro(e, 'Não foi possível remover o semanário.')
          : 'Não foi possível remover o semanário.',
      );
    }
  }

  fecharEnvioSemanario(): void {
    this.mostrarEnvioSemanario.set(false);
  }

  selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    this.erroSemanario.set(null);
    if (!arquivo) {
      this.arquivoMaterial.set(null);
      return;
    }
    // Checagem rápida só pra dar retorno na hora — quem decide de verdade é o back.
    if (!this.tiposMaterialAceitos.includes(arquivo.type)) {
      this.erroSemanario.set('Tipo de arquivo não permitido. Envie um PDF.');
    } else if (arquivo.size > this.tamanhoMaximoMaterialBytes) {
      this.erroSemanario.set('Arquivo muito grande. O limite é 2 MB.');
    } else {
      this.arquivoMaterial.set(arquivo);
      return;
    }
    this.arquivoMaterial.set(null);
    input.value = '';
  }

  /**
   * Envia o semanário e, se houver, o PDF como material dele. Um por grupo e semana:
   * enviar de novo na mesma semana atualiza o plano e soma o material.
   */
  async enviarSemanario(): Promise<void> {
    const grupo = this.grupoEscolhido();
    if (!grupo || grupo.oficinaId == null || !this.podeEnviarSemanario()) return;
    this.enviandoSemanario.set(true);
    this.erroSemanario.set(null);
    try {
      const semanario = await this.semanarioService.enviar({
        oficinaId: grupo.oficinaId,
        turmaId: grupo.turmaId,
        semana: this.semanaSemanario(),
        conteudoPrevisto: this.conteudoPrevisto(),
        objetivos: this.objetivos(),
        recursosNecessarios: this.recursosNecessarios(),
      });
      const arquivo = this.arquivoMaterial();
      if (arquivo) {
        await this.arquivoService.enviar(
          EntidadeArquivo.SEMANARIO,
          semanario.semanarioId,
          CategoriaArquivo.MATERIAL_SEMANARIO,
          arquivo,
        );
      }
      this.sucessoSemanario.set(`Semanário da semana ${rotuloSemana(semanario.semanaInicio)} enviado para ${grupo.nomeTurma}.`);
      this.mostrarEnvioSemanario.set(false);
      await this.carregarSemanarios();
    } catch (e) {
      this.erroSemanario.set(
        e instanceof HttpErrorResponse
          ? mensagemErro(e, 'Não foi possível enviar o semanário.')
          : 'Não foi possível enviar o semanário.',
      );
    } finally {
      this.enviandoSemanario.set(false);
    }
  }

  tamanhoLegivel(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  }

  private async carregarAba(aba: AbaOficineiro): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      if (aba === 'turmas') await this.carregarTurmas();
      if (aba === 'semanario') await this.carregarSemanarios();
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
    const oficinas = await firstValueFrom(
      this.http.get<OficinaResponseDTO[]>(`${this.api}/api/oficinas/minhas-oficinas/${usuario.usuarioId}`),
    );
    this.oficinas.set(oficinas);
  }

  private async carregarSemanarios(): Promise<void> {
    this.semanarios.set(await this.semanarioService.listarMeus());
  }

  private chaveGrupo(turma: OficineiroTurmaDTO): string {
    return `${turma.oficinaId}-${turma.turmaId}`;
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
      valor === 'semanario' ||
      valor === 'comunicados'
    );
  }

}
