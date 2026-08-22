import { Component } from '@angular/core';

@Component({
  selector: 'app-acesso-negado',
  standalone: true,
  template: `
    <div class="notice notice-lock">
      <span>Você não tem permissão para acessar esta área.</span>
    </div>
  `
})
export class AcessoNegado {}