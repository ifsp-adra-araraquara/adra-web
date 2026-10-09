import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrandLogo } from '../brand-logo/brand-logo';

/**
 * Moldura padrão das telas de acesso (login, recuperação/redefinição de senha,
 * convite e convidar usuário): painel de marca + cartão onde a página projeta
 * o próprio <form class="login-form">. Estilos em styles.css ("AUTH").
 * Painel de marca só aparece a partir de 1024px (desktop / iPad na horizontal);
 * abaixo disso o cartão fica sozinho e exibe a logo.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [BrandLogo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-screen" [class.login-screen--inline]="inline()">
      <div class="login-shell">
        <aside class="brand-panel" aria-hidden="true">
          <div class="brand-panel-glow"></div>
          <div class="brand-panel-grid"></div>

          <div class="brand-panel-content">
            <app-brand-logo variant="white" [size]="56" class="brand-logo" />
            <p class="brand-title">{{ titulo() }}</p>
            <p class="brand-tagline">{{ descricao() }}</p>
          </div>

          <div class="brand-panel-footer">
            Agência Adventista de Desenvolvimento e Recursos Assistenciais
          </div>
        </aside>

        <div class="login-card">
          <div class="login-brand">
            <app-brand-logo variant="green" [size]="32" />
            <div class="login-logo-text serif">Sistema de Gestão</div>
          </div>
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class AuthShell {
  titulo = input.required<string>();
  descricao = input.required<string>();
  /** Renderiza dentro do layout autenticado (sem tela cheia/fixed), ex.: Convidar usuário. */
  inline = input(false);
}
