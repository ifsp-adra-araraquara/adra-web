import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const NOME_SISTEMA = 'ADRA Araraquara';

/** Título da aba por tela: "Disciplinar · ADRA Araraquara" (WCAG 2.4.2). Usa o `title` de cada rota. */
@Injectable({ providedIn: 'root' })
export class TituloPaginaStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const tela = this.buildTitle(snapshot);
    this.title.setTitle(tela ? `${tela} · ${NOME_SISTEMA}` : NOME_SISTEMA);
  }
}
