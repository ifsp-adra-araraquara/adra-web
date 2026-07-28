import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Role } from '../../shared/enum/role.enum';
import { ROLE_LABELS } from '../../shared/enum/role-labels';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = 'coordenador@adra.org.br';
  senha = 'adra2025';
  perfilSelecionado: Role = Role.COORD;

  // Alterado de 'roles' para 'perfis' para coincidir com o HTML
  perfis = Object.values(Role);
  labels = ROLE_LABELS;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  entrar(): void {
    if (!this.email || !this.senha) {
      return; 
    }
    this.authService.login(this.perfilSelecionado);
    this.router.navigate(['home']);
  }
}