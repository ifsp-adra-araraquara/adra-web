import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth.service';
import { ChamadaService } from '../../../core/chamada.service';
import { FolhaA4 } from '../../../shared/components/folha-a4/folha-a4';
import { Icon } from '../../../shared/components/icon/icon';
import { Select, SelectOption } from '../../../shared/components/select/select';
import { Role } from '../../../shared/enum/role.enum';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { hojeISO } from '../../../shared/utils/aula.util';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { ListaFrequencia, montarListaFrequencia } from './lista-frequencia.util';

/**
 * /chamada/turma/:turmaId/lista?mes=yyyy-MM — lista de frequência do grupo no
 * mês, em A4 deitado, para imprimir ou salvar em PDF (prestação de contas).
 * Gerada na hora a partir da grade mensal; nada fica guardado.
 */
@Component({
  selector: 'app-lista-frequencia',
  imports: [FormsModule, FolhaA4, Icon, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ferramentas no-print">
      <h1 class="titulo-tela">Lista de frequência do mês</h1>
      <div class="linha">
        @if (opcoesGrupo().length) {
          <div class="campo campo-grupo">
            <label for="lf-grupo">Grupo</label>
            <app-select id="lf-grupo" [options]="opcoesGrupo()" [ngModel]="turmaId()" (ngModelChange)="trocarGrupo($event)" />
          </div>
        }
        <div class="campo">
          <label for="lf-mes">Mês</label>
          <input id="lf-mes" class="input" type="month" [max]="mesAtual" [ngModel]="mes()" (ngModelChange)="trocarMes($event)" />
        </div>
      </div>
      <p class="dica">
        Para guardar em PDF, use <b>Imprimir ou salvar PDF</b> e escolha <b>Salvar como PDF</b> no destino da impressão.
      </p>
      @if (erro()) {
        <div class="notice notice-error" role="alert"><app-icon name="alert-circle" /><span>{{ erro() }}</span></div>
      }
    </div>

    @if (carregando()) {
      <p class="muted no-print" role="status">Carregando…</p>
    } @else if (lista(); as l) {
      <app-folha-a4 [rotulo]="l.titulo" rotuloImprimir="Imprimir ou salvar PDF" [paisagem]="true">
        <h2 class="doc-titulo">{{ l.titulo }}</h2>
        <p class="doc-sub">
          {{ l.linhas.length }} atendidos · {{ l.diasComChamada }} dias com chamada
          @if (l.frequenciaGeral != null) { · frequência do grupo {{ l.frequenciaGeral }}% }
        </p>

        @if (l.linhas.length) {
          <table class="doc-tabela">
            <caption class="sr-only">Presença por atendido e dia</caption>
            <thead>
              <tr>
                <th scope="col" class="num">Nº</th>
                <th scope="col" class="nome">Nome</th>
                @for (c of l.colunas; track c.data) {
                  <th scope="col" class="dia" [class.sem]="c.semChamada" [attr.title]="c.semChamada">
                    <span>{{ c.dia }}</span><small>{{ c.semana }}</small>
                  </th>
                }
                <th scope="col" class="num">P</th>
                <th scope="col" class="num">F</th>
                <th scope="col" class="num">FJ</th>
                <th scope="col" class="num">%</th>
              </tr>
            </thead>
            <tbody>
              @for (linha of l.linhas; track linha.assistidoId; let i = $index) {
                <tr>
                  <td class="num">{{ i + 1 }}</td>
                  <td class="nome">{{ linha.nome }}@if (linha.saida) { <small> (saiu {{ dataCurta(linha.saida) }})</small> }</td>
                  @for (celula of linha.celulas; track $index; let j = $index) {
                    <td class="dia" [class.sem]="l.colunas[j].semChamada" [class.falta]="celula === 'F'">{{ celula }}</td>
                  }
                  <td class="num">{{ linha.presencas }}</td>
                  <td class="num">{{ linha.faltas }}</td>
                  <td class="num">{{ linha.justificadas }}</td>
                  <td class="num">{{ linha.frequencia ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <p class="legenda">
            P = presente · F = falta · FJ = falta justificada · — = sem chamada ou fora do grupo
            @for (s of l.semChamada; track s.data) { · {{ dataCurta(s.data) }}: {{ s.rotulo }} }
          </p>
        } @else {
          <p class="doc-vazio">Nenhum atendido no grupo neste mês.</p>
        }

        <div class="assinaturas">
          <p><span class="linha-assinatura"></span>Educador(a) Social</p>
          <p><span class="linha-assinatura"></span>Coordenação ADRA</p>
        </div>
      </app-folha-a4>
    }
  `,
  styles: `
    .ferramentas { max-width: 297mm; margin: 0 auto 16px; }
    .titulo-tela { margin: 8px 0 12px; font-size: 22px; }
    .linha { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
    .campo { display: flex; flex-direction: column; gap: 4px; }
    .campo-grupo { width: 260px; max-width: 100%; }
    .campo label { font-size: 13px; font-weight: 600; color: var(--gray-600); }
    .dica { margin: 10px 0 0; font-size: 13px; color: var(--gray-600); }
    .doc-titulo { margin: 14px 0 2px; font-size: 13pt; text-align: center; }
    .doc-sub { margin: 0 0 10px !important; text-align: center; font-size: 9pt; color: #333; }
    .doc-tabela { width: 100%; border-collapse: collapse; font-size: 8pt; }
    .doc-tabela th, .doc-tabela td { padding: 2px 3px; border: 1px solid #999; text-align: center; color: #111; }
    .doc-tabela thead th {
      height: auto; background: #f0f0f0; font-size: 8pt; font-weight: 700;
      text-transform: none; letter-spacing: normal; white-space: nowrap;
    }
    .doc-tabela .nome { text-align: left; white-space: nowrap; }
    .doc-tabela .num { text-align: right; white-space: nowrap; }
    .doc-tabela .dia { min-width: 18px; }
    .doc-tabela th.dia span, .doc-tabela th.dia small { display: block; line-height: 1.1; }
    .doc-tabela th.dia small { font-weight: 400; }
    .doc-tabela .sem { background: #e4e4e4; }
    .doc-tabela td.falta { font-weight: 700; }
    .doc-tabela tr { break-inside: avoid; }
    .legenda { margin-top: 6px !important; font-size: 8pt; }
    .doc-vazio { text-align: center; }
    .assinaturas { display: flex; justify-content: space-around; gap: 24px; margin-top: 28px; font-size: 9pt; text-align: center; }
    .linha-assinatura { display: block; width: 70mm; max-width: 40vw; border-top: 1px solid #111; margin: 0 auto 4px; }
    @media (max-width: 719px) {
      .doc-tabela { display: block; overflow-x: auto; }
    }
  `,
})
export class ListaFrequenciaPagina implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly chamadaService = inject(ChamadaService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly mesAtual = hojeISO().slice(0, 7);
  protected readonly turmaId = signal<number | null>(null);
  protected readonly mes = signal(this.mesAtual);
  protected readonly turmas = signal<TurmaResponseDTO[]>([]);
  protected readonly lista = signal<ListaFrequencia | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly opcoesGrupo = computed<SelectOption<number>[]>(() =>
    this.turmas().map((t) => ({ value: t.turmaId, label: t.nomeTurma })),
  );

  async ngOnInit(): Promise<void> {
    const turmaId = Number(this.route.snapshot.paramMap.get('turmaId'));
    this.turmaId.set(Number.isInteger(turmaId) && turmaId > 0 ? turmaId : null);
    const mes = this.route.snapshot.queryParamMap.get('mes');
    if (mes && /^\d{4}-\d{2}$/.test(mes)) this.mes.set(mes);

    // O Educador Social não lista os grupos (a API não deixa): troca só o mês.
    if (this.auth.currentProfile() !== Role.EDUCADOR) {
      firstValueFrom(this.http.get<TurmaResponseDTO[]>(`${environment.apiUrl}/api/turmas`))
        .then((turmas) => this.turmas.set([...turmas].sort((a, b) => a.nomeTurma.localeCompare(b.nomeTurma))))
        .catch(() => this.turmas.set([]));
    }
    await this.carregar();
  }

  protected trocarGrupo(turmaId: number | null): void {
    if (turmaId == null || turmaId === this.turmaId()) return;
    this.turmaId.set(turmaId);
    this.router.navigate(['/chamada/turma', turmaId, 'lista'], { queryParams: { mes: this.mes() }, replaceUrl: true });
    this.carregar();
  }

  protected trocarMes(mes: string): void {
    if (!/^\d{4}-\d{2}$/.test(mes ?? '') || mes === this.mes()) return;
    this.mes.set(mes);
    this.router.navigate([], { relativeTo: this.route, queryParams: { mes }, replaceUrl: true });
    this.carregar();
  }

  protected dataCurta(data: string): string {
    return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
  }

  private async carregar(): Promise<void> {
    const turmaId = this.turmaId();
    if (turmaId == null) {
      this.carregando.set(false);
      this.erro.set('Grupo não encontrado.');
      return;
    }
    const mes = this.mes();
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const grade = await this.chamadaService.carregarGradeMensal(turmaId, mes);
      if (mes !== this.mes() || turmaId !== this.turmaId()) return;
      this.lista.set(montarListaFrequencia(grade));
    } catch (e) {
      this.lista.set(null);
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar a lista do mês.'));
    } finally {
      this.carregando.set(false);
    }
  }
}
