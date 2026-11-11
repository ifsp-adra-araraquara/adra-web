import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { GuardaDadosService } from '../../../core/guarda-dados.service';
import { DescarteDTO, OrfaosDTO, PreviaDescarteDTO } from '../../../shared/models/guarda/GuardaDados';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { formatarTamanho } from '../../../shared/utils/compressao-imagem.util';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

/** "1 matrícula", "2 matrículas". */
function contagem(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * /assistidos/prazo-de-guarda — descarte pelo prazo de guarda (5 anos por
 * matrícula) e limpeza do armazenamento. Só o Coordenador. A equipe exporta a
 * lista de cada ano antes de descartar; o que sai não volta.
 */
@Component({
  selector: 'app-guarda-dados',
  imports: [DatePipe, RouterLink, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page" aria-labelledby="gd-titulo">
      <a class="btn-voltar" routerLink="/assistidos"><app-icon name="chevron-left" /> Atendidos</a>
      <header class="page-header">
        <div class="page-header-texto">
          <h1 id="gd-titulo">Prazo de guarda dos dados</h1>
          <p class="page-intro">
            Os dados de cada matrícula ficam guardados por 5 anos. Depois disso podem ser descartados, junto com os
            documentos. A ficha do atendido só sai quando ele não tem nenhuma matrícula dentro do prazo.
          </p>
        </div>
      </header>

      @if (erro()) {
        <div class="notice notice-error" role="alert">{{ erro() }}</div>
      }
      @if (aviso()) {
        <div class="notice notice-info" role="status">{{ aviso() }}</div>
      }

      <section class="card card-pad bloco" aria-labelledby="gd-previa">
        <h2 id="gd-previa" class="form-sec-title">Fora do prazo hoje</h2>
        @if (carregando()) {
          <p class="muted" role="status">Carregando…</p>
        } @else if (previa(); as p) {
          @if (vazio()) {
            <p class="muted">Nada passou do prazo de guarda. Matrículas criadas antes de {{ p.limite | date: 'dd/MM/yyyy' }} sairiam.</p>
          } @else {
            <ul class="numeros" role="list">
              <li><b>{{ p.matriculas }}</b> {{ p.matriculas === 1 ? 'matrícula criada' : 'matrículas criadas' }} antes de {{ p.limite | date: 'dd/MM/yyyy' }}</li>
              <li><b>{{ p.atendidosRemovidos }}</b> {{ p.atendidosRemovidos === 1 ? 'atendido sai' : 'atendidos saem' }} por inteiro (sem matrícula no prazo)</li>
              <li><b>{{ p.responsaveis }}</b> {{ p.responsaveis === 1 ? 'responsável sem' : 'responsáveis sem' }} outro atendido</li>
              <li><b>{{ p.preCadastros }}</b> {{ p.preCadastros === 1 ? 'pré-cadastro' : 'pré-cadastros' }}</li>
              <li><b>{{ p.registrosDisciplinares }}</b> {{ p.registrosDisciplinares === 1 ? 'registro disciplinar' : 'registros disciplinares' }}</li>
              <li><b>{{ p.arquivos }}</b> {{ p.arquivos === 1 ? 'arquivo' : 'arquivos' }} ({{ tamanho(p.bytes) }} liberados no armazenamento)</li>
            </ul>

            @if (p.anos.length) {
              <p class="dica">Antes de descartar, guarde a lista de cada ano:</p>
              <div class="anos">
                @for (ano of p.anos; track ano) {
                  <a class="btn btn-ghost btn-sm" routerLink="/assistidos/por-ano" [queryParams]="{ ano }">
                    <app-icon name="download" [size]="16" /> Lista de {{ ano }}
                  </a>
                }
              </div>
            }

            @if (p.quemSaiPorInteiro.length) {
              <h3 class="subtitulo">Saem por inteiro</h3>
              <ul class="nomes" role="list">
                @for (a of p.quemSaiPorInteiro; track a.assistidoId) {
                  <li>{{ a.nomeCompleto }} @if (a.ultimoAno) { <span class="sub">— última matrícula em {{ a.ultimoAno }}</span> }</li>
                }
              </ul>
            }

            <label class="check">
              <input type="checkbox" [checked]="confirmado()" (change)="confirmado.set($any($event.target).checked)" />
              <span>Entendi: esses dados e documentos serão apagados de vez e não podem ser recuperados.</span>
            </label>
            <app-button variant="danger" [disabled]="!confirmado()" [loading]="descartando()" (click)="descartar()">
              Descartar dados fora do prazo
            </app-button>
          }
        }
      </section>

      <section class="card card-pad bloco" aria-labelledby="gd-armazenamento">
        <h2 id="gd-armazenamento" class="form-sec-title">Arquivos sem dono no armazenamento</h2>
        <p class="dica">
          Arquivos que ficaram no armazenamento sem estar ligados a ninguém (por exemplo, um envio que caiu no meio).
          Só contam os que têm mais de 24 horas. O sistema também tenta de novo, toda madrugada, o que não conseguiu apagar.
        </p>
        @if (orfaos(); as o) {
          <p role="status">
            <b>{{ o.arquivos }}</b> {{ o.arquivos === 1 ? 'arquivo sem dono' : 'arquivos sem dono' }} ({{ tamanho(o.bytes) }})
            · <b>{{ o.naFilaDeRemocao }}</b> na fila de remoção.
          </p>
        }
        <div class="acoes">
          <app-button variant="secondary" size="sm" [loading]="verificando()" (click)="verificarOrfaos()">Verificar</app-button>
          @if (orfaos(); as o) {
            @if (o.arquivos || o.naFilaDeRemocao) {
              <app-button variant="danger" size="sm" [loading]="removendo()" (click)="removerOrfaos()">
                Remover arquivos sem dono
              </app-button>
            }
          }
        </div>
      </section>

      @if (historico().length) {
        <section class="card card-pad bloco" aria-labelledby="gd-historico">
          <h2 id="gd-historico" class="form-sec-title">Descartes feitos</h2>
          <ul class="historico" role="list">
            @for (d of historico(); track d.descarteId) {
              <li>
                {{ d.executadoEm | date: 'dd/MM/yyyy HH:mm' }} · {{ d.executadoPorNome || 'Coordenação' }} ·
                {{ contagem(d.matriculas, 'matrícula', 'matrículas') }}, {{ contagem(d.atendidos, 'atendido', 'atendidos') }},
                {{ contagem(d.arquivos, 'arquivo', 'arquivos') }} ({{ tamanho(d.bytesLiberados) }})
              </li>
            }
          </ul>
        </section>
      }
    </section>
  `,
  styles: `
    .bloco { margin-bottom: 16px; }
    .numeros { margin: 0 0 14px; padding-left: 18px; font-size: 14px; line-height: 1.7; color: var(--gray-800); }
    .dica { margin: 0 0 10px; font-size: 13px; color: var(--gray-600); }
    .anos { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .subtitulo { margin: 0 0 6px; font-size: 14px; font-weight: 600; color: var(--gray-800); }
    .nomes { max-height: 220px; overflow-y: auto; margin: 0 0 12px; padding: 8px 12px 8px 28px; border: 1px solid var(--gray-200); border-radius: var(--radius-sm); font-size: 14px; line-height: 1.6; }
    .sub { color: var(--gray-600); }
    .acoes { display: flex; flex-wrap: wrap; gap: 8px; }
    .historico { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.7; color: var(--gray-800); }
  `,
})
export class GuardaDados implements OnInit {
  private readonly service = inject(GuardaDadosService);

  protected readonly previa = signal<PreviaDescarteDTO | null>(null);
  protected readonly historico = signal<DescarteDTO[]>([]);
  protected readonly orfaos = signal<OrfaosDTO | null>(null);
  protected readonly carregando = signal(true);
  protected readonly confirmado = signal(false);
  protected readonly descartando = signal(false);
  protected readonly verificando = signal(false);
  protected readonly removendo = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly vazio = computed(() => {
    const p = this.previa();
    return !p || (p.matriculas === 0 && p.preCadastros === 0);
  });

  protected readonly tamanho = formatarTamanho;
  protected readonly contagem = contagem;

  ngOnInit(): void {
    this.carregar();
  }

  protected async descartar(): Promise<void> {
    if (!this.confirmado() || this.descartando()) return;
    this.descartando.set(true);
    this.erro.set(null);
    try {
      const feito = await this.service.descartar();
      this.aviso.set(
        `Descarte feito: ${contagem(feito.matriculas, 'matrícula', 'matrículas')}, ` +
          `${contagem(feito.atendidos, 'atendido', 'atendidos')} e ${contagem(feito.arquivos, 'arquivo', 'arquivos')}.`,
      );
      this.confirmado.set(false);
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível descartar. Nada foi apagado; tente de novo.'));
    } finally {
      this.descartando.set(false);
    }
  }

  protected async verificarOrfaos(): Promise<void> {
    this.verificando.set(true);
    this.erro.set(null);
    try {
      this.orfaos.set(await this.service.orfaos());
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível verificar o armazenamento.'));
    } finally {
      this.verificando.set(false);
    }
  }

  protected async removerOrfaos(): Promise<void> {
    this.removendo.set(true);
    this.erro.set(null);
    try {
      this.orfaos.set(await this.service.removerOrfaos());
      this.aviso.set('Arquivos sem dono removidos do armazenamento.');
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível remover os arquivos.'));
    } finally {
      this.removendo.set(false);
    }
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const [previa, historico] = await Promise.all([this.service.previa(), this.service.descartes()]);
      this.previa.set(previa);
      this.historico.set(historico);
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar o prazo de guarda.'));
    } finally {
      this.carregando.set(false);
    }
  }
}
