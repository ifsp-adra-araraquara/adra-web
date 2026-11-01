import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

import { PreCadastroService } from '../../../core/pre-cadastro.service';
import { FolhaA4 } from '../../../shared/components/folha-a4/folha-a4';
import { mensagemErro } from '../../../shared/utils/erro-http.util';
import { FichaCadastroSocialDocumento } from './ficha-cadastro-social';
import { FichaCadastroSocial, dePreCadastro } from './ficha-cadastro-social.model';

/** /pre-cadastros/:id/ficha — ficha para a família assinar, com o que ela respondeu no link público. */
@Component({
  selector: 'app-ficha-pre-cadastro',
  imports: [FolhaA4, FichaCadastroSocialDocumento],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (erro()) {
      <div class="notice notice-error no-print" role="alert">{{ erro() }}</div>
    } @else if (ficha(); as f) {
      <app-folha-a4 rotulo="Ficha de cadastro social"><app-ficha-cadastro-social [ficha]="f" /></app-folha-a4>
    } @else {
      <p class="muted no-print">Carregando ficha…</p>
    }
  `,
})
export class FichaPreCadastro implements OnInit {
  private readonly service = inject(PreCadastroService);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly ficha = signal<FichaCadastroSocial | null>(null);
  protected readonly erro = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.ficha.set(dePreCadastro(await this.service.buscar(this.id)));
    } catch (e) {
      this.erro.set(mensagemErro(e as HttpErrorResponse, 'Não foi possível carregar a ficha.'));
    }
  }
}
