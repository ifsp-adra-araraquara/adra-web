import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';

import { BrandLogo } from '../brand-logo/brand-logo';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { INSTITUICAO } from '../../utils/instituicao';

/**
 * Folha A4 para imprimir (é assim que geramos PDF, sem biblioteca): barra
 * Voltar/Imprimir, cabeçalho com a logo e os dados da ADRA, o conteúdo
 * projetado e o rodapé com endereço e contato. Na impressão o menu e a barra somem.
 *
 *   <app-folha-a4 rotulo="Ficha de cadastro social"> ...documento... </app-folha-a4>
 */
@Component({
  selector: 'app-folha-a4',
  imports: [BrandLogo, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block;' },
  template: `
    <div class="barra no-print">
      <app-button variant="secondary" size="sm" (click)="voltar()">
        <app-icon name="chevron-left" [size]="16" /> Voltar
      </app-button>
      <app-button size="sm" (click)="imprimir()">
        <app-icon name="file-text" [size]="16" /> Imprimir
      </app-button>
    </div>

    <article class="folha" [attr.aria-label]="rotulo()">
      <header class="folha-cabecalho">
        <app-brand-logo [size]="44" [markOnly]="true" />
        <div>
          <p class="instituicao">{{ INSTITUICAO.nome }}</p>
          <p>{{ INSTITUICAO.nucleo }}</p>
          <p class="cnpj">{{ INSTITUICAO.cnpj }}</p>
        </div>
      </header>

      <ng-content />

      <footer class="folha-rodape">
        <p>{{ INSTITUICAO.endereco }}</p>
        <p>{{ INSTITUICAO.contato }}</p>
      </footer>
    </article>
  `,
  styles: `
    .barra { display: flex; justify-content: space-between; gap: 10px; max-width: 210mm; margin: 0 auto 16px; }
    .folha {
      box-sizing: border-box; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm 16mm 12mm;
      display: flex; flex-direction: column; background: #fff; color: #111;
      font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.45;
      box-shadow: var(--shadow-sm); border: 1px solid var(--gray-100);
    }
    .folha p { margin: 0; }
    .folha-cabecalho { display: flex; align-items: center; gap: 14px; justify-content: center; text-align: center; }
    .instituicao { font-variant: small-caps; font-size: 13pt; }
    .cnpj { font-size: 8.5pt; }
    .folha-rodape { margin-top: auto; padding-top: 18px; text-align: center; font-size: 8.5pt; font-style: italic; }
    @media (max-width: 719px) {
      .folha { min-height: 0; padding: 20px 16px; }
      .folha-cabecalho { flex-direction: column; }
    }
    @media print {
      @page { size: A4; margin: 0; }
      .folha { box-shadow: none; border: none; max-width: none; width: 210mm; min-height: 297mm; }
    }
  `,
})
export class FolhaA4 {
  rotulo = input('Documento para impressão');

  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);
  protected readonly INSTITUICAO = INSTITUICAO;

  protected voltar(): void {
    this.location.back();
  }

  protected imprimir(): void {
    this.document.defaultView?.print();
  }
}
