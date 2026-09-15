import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AulaRequestDTO } from '../../../shared/models/aula/AulaRequestDTO';
import { AulaResponseDTO } from '../../../shared/models/aula/AulaResponseDTO';
import { OficineiroComunicadoDTO } from '../../../shared/models/oficineiro/OficineiroComunicadoDTO';
import { OficineiroMaterialDTO } from '../../../shared/models/oficineiro/OficineiroMaterialDTO';
import { OficineiroTurmaDTO } from '../../../shared/models/oficineiro/OficineiroTurmaDTO';
import { AuthService } from '../../../core/auth.service';

type AbaOficineiro = 'turmas' | 'aulas' | 'materiais' | 'comunicados';

@Component({
  selector: 'app-oficineiro',
  imports: [FormsModule],
  templateUrl: './oficineiro.html',
  styleUrl: './oficineiro.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Oficineiro implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  readonly aba = signal<AbaOficineiro>('turmas');
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly turmas = signal<OficineiroTurmaDTO[]>([]);
  readonly aulas = signal<AulaResponseDTO[]>([]);
  readonly materiais = signal<OficineiroMaterialDTO[]>([]);
  readonly comunicados = signal<OficineiroComunicadoDTO[]>([]);
  readonly turmaSelecionada = signal<OficineiroTurmaDTO | null>(null);
  readonly alunos = signal<{ assistidoId: number; nomeCompleto: string }[]>([]);
  readonly mostrarFormularioAula = signal(false);
  readonly salvandoAula = signal(false);
  readonly aulaEmEdicao = signal<number | null>(null);
  readonly mostrarUploadMaterial = signal(false);
  readonly enviandoMaterial = signal(false);
  readonly arquivoMaterial = signal<File | null>(null);
  readonly aulaForm: AulaRequestDTO = {
    turmaId: 0,
    dataAula: '',
    titulo: '',
    descricao: '',
    conteudoPrevisto: '',
    conteudoMinistrado: '',
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
    this.router.navigate([], { relativeTo: this.route, queryParams: { aba }, queryParamsHandling: 'merge' });
    this.carregarAba(aba);
  }

  abrirTurma(turma: OficineiroTurmaDTO): void {
    this.turmaSelecionada.set(turma);
    this.http.get<{ assistidoId: number; nomeCompleto: string }[]>(`${this.api}/api/assistidos`, {
      params: { turmaId: turma.turmaId.toString(), ativo: 'true' },
    }).subscribe({ next: (alunos) => this.alunos.set(alunos), error: () => this.erro.set('Não foi possível carregar os alunos da turma.') });
  }

  fecharTurma(): void {
    this.turmaSelecionada.set(null);
    this.alunos.set([]);
  }

  abrirNovaAula(): void {
    this.aulaEmEdicao.set(null);
    this.aulaForm.turmaId = this.turmas()[0]?.turmaId ?? 0;
    this.aulaForm.dataAula = new Date().toISOString().slice(0, 10);
    this.aulaForm.conteudoPrevisto = '';
    this.aulaForm.conteudoMinistrado = '';
    this.aulaForm.statusAula = undefined;
    this.mostrarFormularioAula.set(true);
  }

  editarAula(aula: AulaResponseDTO): void {
    this.aulaEmEdicao.set(aula.aulaId);
    this.aulaForm.turmaId = aula.turmaId;
    this.aulaForm.dataAula = aula.dataAula;
    this.aulaForm.titulo = aula.titulo;
    this.aulaForm.descricao = aula.descricao ?? '';
    this.aulaForm.conteudoPrevisto = aula.conteudoPrevisto ?? '';
    this.aulaForm.conteudoMinistrado = aula.conteudoMinistrado ?? '';
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
        await firstValueFrom(this.http.put<AulaResponseDTO>(`${this.api}/api/aulas/${aulaId}`, this.aulaForm));
      } else {
        await firstValueFrom(this.http.post<AulaResponseDTO>(`${this.api}/api/aulas`, this.aulaForm));
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
    const turmas = await firstValueFrom(this.http.get<OficineiroTurmaDTO[]>(`${this.api}/api/turmas/minhas-turmas/${usuario.usuarioId}`));
    this.turmas.set(turmas);
  }

  private async carregarAulas(): Promise<void> {
    await this.carregarTurmas();
    const aulas = await Promise.all(this.turmas().map((turma) => firstValueFrom(this.http.get<AulaResponseDTO[]>(`${this.api}/api/aulas/turma/${turma.turmaId}`))));
    this.aulas.set(aulas.flat().sort((a, b) => b.dataAula.localeCompare(a.dataAula)));
  }

  private async carregarMateriais(): Promise<void> {
    const materiais = await firstValueFrom(this.http.get<OficineiroMaterialDTO[]>(`${this.api}/api/materiais/minhas-turmas`));
    this.materiais.set(materiais);
  }

  private async carregarComunicados(): Promise<void> {
    const comunicados = await firstValueFrom(this.http.get<OficineiroComunicadoDTO[]>(`${this.api}/api/comunicados/minhas-turmas`));
    this.comunicados.set(comunicados);
  }

  private usuarioLogado() {
    return this.auth.currentUserResponse();
  }

  private ehAba(valor: string | null): valor is AbaOficineiro {
    return valor === 'turmas' || valor === 'aulas' || valor === 'materiais' || valor === 'comunicados';
  }
}