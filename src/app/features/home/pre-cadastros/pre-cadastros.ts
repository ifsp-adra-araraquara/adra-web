import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PreCadastroService } from '../../../core/pre-cadastro.service';
import { PreCadastroResponseDTO } from '../../../shared/models/precadastro/PreCadastro';
import { Button } from '../../../shared/components/button/button';
import { mensagemErro } from '../../../shared/utils/erro-http.util';

/**
 * Lista de quem preencheu o pré-cadastro público, pra equipe revisar e
 * cadastrar de verdade manualmente (ou descartar). Sem fluxo automático de
 * conversão ainda — é só o essencial pra não perder nenhum envio.
 */
@Component({
  selector: 'app-pre-cadastros',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header-texto">
          <h1>Pré-cadastros</h1>
          <p class="page-intro">Enviados pela família pelo link público, aguardando revisão da equipe.</p>
        </div>
      </header>

      @if (erro()) {
        <div class="notice notice-error" role="alert">{{ erro() }}</div>
      }

      @if (carregando()) {
        <div class="card"><p class="muted">Carregando…</p></div>
      } @else if (itens().length === 0) {
        <div class="card"><p class="muted">Nenhum pré-cadastro pendente.</p></div>
      } @else {
        <ul class="lista-cartoes" role="list">
          @for (item of itens(); track item.preCadastroId) {
            <li class="card pc-item">
              <div>
                <b>{{ item.nomeCompleto }}</b>
                <p class="muted" style="margin: 4px 0">
                  Responsável: {{ item.responsavelNome }}
                  @if (item.responsavelTelefone) { · {{ item.responsavelTelefone }} }
                </p>
                @if (item.endereco) { <p class="muted" style="margin: 0">{{ item.endereco }}</p> }
              </div>
              <div class="pc-item-acoes">
                <app-button variant="secondary" size="sm" (click)="descartar(item)">Descartar</app-button>
                <app-button size="sm" (click)="converter(item)">Marcar como convertido</app-button>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .lista-cartoes { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
    .pc-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .pc-item-acoes { display: flex; gap: 8px; flex: none; }
  `,
})
export class PreCadastros implements OnInit {
  private readonly service = inject(PreCadastroService);

  readonly itens = signal<PreCadastroResponseDTO[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      this.itens.set(await this.service.listarPendentes());
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar os pré-cadastros.'));
    } finally {
      this.carregando.set(false);
    }
  }

  async descartar(item: PreCadastroResponseDTO): Promise<void> {
    try {
      await this.service.descartar(item.preCadastroId);
      this.itens.update((lista) => lista.filter((i) => i.preCadastroId !== item.preCadastroId));
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível descartar.'));
    }
  }

  async converter(item: PreCadastroResponseDTO): Promise<void> {
    try {
      await this.service.marcarConvertido(item.preCadastroId);
      this.itens.update((lista) => lista.filter((i) => i.preCadastroId !== item.preCadastroId));
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível marcar como convertido.'));
    }
  }
}
