import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BrandLogo } from '../../shared/components/brand-logo/brand-logo';

@Component({
  selector: 'app-definir-senha-convite',
  standalone: true,
  imports: [FormsModule, RouterLink, BrandLogo],
  templateUrl: './definir-senha-convite.html',
  styleUrl: './definir-senha-convite.css'
})
export class DefinirSenhaConvite implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private token = '';
  linkValido = signal<boolean | null>(null);
  novaSenha = '';
  confirmarSenha = '';
  erro = signal<string | null>(null);
  carregando = signal(false);
  concluido = signal(false);

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!this.token) {
      this.linkValido.set(false);
      return;
    }

    try {
      await this.http.get(`${environment.apiUrl}/api/convite/${this.token}`).toPromise();
      this.linkValido.set(true);
    } catch {
      this.linkValido.set(false);
    }
  }

  private validarPolitica(senha: string): string | null {
    if (senha.length < 8) return 'A senha precisa ter no minimo 8 caracteres.';
    if (!/[A-Za-z]/.test(senha)) return 'A senha precisa ter ao menos uma letra.';
    if (!/[0-9]/.test(senha)) return 'A senha precisa ter ao menos um numero.';
    return null;
  }

  async definir(): Promise<void> {
    this.erro.set(null);

    const erroPolitica = this.validarPolitica(this.novaSenha);
    if (erroPolitica) {
      this.erro.set(erroPolitica);
      return;
    }
    if (this.novaSenha !== this.confirmarSenha) {
      this.erro.set('As senhas nao coincidem.');
      return;
    }

    this.carregando.set(true);
    try {
      await this.http.post(`${environment.apiUrl}/api/convite/${this.token}/definir-senha`, {
        novaSenha: this.novaSenha
      }).toPromise();
      this.concluido.set(true);
      setTimeout(() => this.router.navigate(['/login']), 2500);
    } catch (e: any) {
      this.erro.set(e?.error ?? 'Nao foi possivel definir a senha. O convite pode ter expirado.');
    } finally {
      this.carregando.set(false);
    }
  }
}