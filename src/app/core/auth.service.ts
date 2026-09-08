import { HttpClient } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, from, throwError } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AppModule } from '../shared/enum/module.enum';
import { DashboardType } from '../shared/enum/dashboard-type.enum';
import { Role } from '../shared/enum/role.enum';
import { UsuarioResponse } from '../shared/models/usuarios/UsuarioResponse';
import { ModuloDTO } from '../shared/models/modulo/ModuloDTO';
import { supabase } from './supabase.client';

export interface LoginResponse {
  token: string;
  usuario: UsuarioResponse;
}

const CHAVE_TOKEN = 'adra.token';
const USER_KEY = 'usuario_logado';
const MODULE_KEY = 'modulo_atual';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentModule = signal<AppModule | null>(null);
  private usuarioLogado = signal<UsuarioResponse | null>(null);

  private dashTypeMap: Record<Role, DashboardType | null> = {
    [Role.ADMIN]: null,
    [Role.COORD]: DashboardType.COORDENADOR,
    [Role.SOCIO]: DashboardType.SOCIOPEDAGOGICO,
    [Role.PROFS]: DashboardType.PROFISSIONAL_SAUDE,
    [Role.FINANCEIRO]: DashboardType.FINANCEIRO,
    [Role.OFICINEIRO]: null,
  };

  currentProfile = computed<Role | null>(() => this.usuarioLogado()?.nivelPermissao ?? null);

  modulos = computed<ModuloDTO[]>(() => this.usuarioLogado()?.modulos ?? []);

  dashType = computed<DashboardType | null>(() => {
    const nivel = this.usuarioLogado()?.nivelPermissao;
    return nivel ? this.dashTypeMap[nivel] ?? null : null;
  });

  currentUser = computed(() => {
    const u = this.usuarioLogado();
    return u ? { name: u.nomeCompleto, role: u.cargoFuncao ?? '' } : null;
  });

  get token(): string | null {
    return localStorage.getItem(CHAVE_TOKEN);
  }

  constructor() {
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        const user: UsuarioResponse = JSON.parse(storedUser);
        this.usuarioLogado.set(user);

        const storedModule = localStorage.getItem(MODULE_KEY);
        if (storedModule && this.moduloExisteNaLista(storedModule, user.modulos)) {
          this.currentModule.set(storedModule as AppModule);
        } else {
          const padrao = user.modulos.find(m => m.padrao)?.codigo ?? user.modulos[0]?.codigo ?? null;
          if (padrao) this.currentModule.set(padrao.toLowerCase() as AppModule);
        }
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    supabase.auth.onAuthStateChange((evento, sessao) => {
     
      if (evento === 'PASSWORD_RECOVERY') return;

      const deveTrocar = evento === 'INITIAL_SESSION' || evento === 'TOKEN_REFRESHED';
      if (deveTrocar && sessao) {
        this.trocarPorTokenDaAplicacao().subscribe({ error: () => this.logout() });
      }
    });
  }

  async login(email: string, senha: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      throw new Error('E-mail ou senha invalidos.');
    }
    await firstValueFrom(this.trocarPorTokenDaAplicacao());
  }

  async solicitarRecuperacaoSenha(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) {
      throw new Error(
        'Nao foi possivel enviar o e-mail agora. Peca a um Administrador para redefinir sua senha.'
      );
    }
  }

  /**
   * Usado tanto na recuperação (US-03) quanto no convite (US-02) — a sessão
   * temporária de recovery/invite já está ativa nesse ponto.
   */
  async redefinirSenha(novaSenha: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      throw new Error('Nao foi possivel redefinir a senha. O link pode ter expirado, solicite um novo.');
    }
    await supabase.auth.signOut();
  }

  trocarPorTokenDaAplicacao(): Observable<LoginResponse> {
    return from(supabase.auth.getSession()).pipe(
      switchMap(({ data }) => {
        const tokenSupabase = data.session?.access_token;
        if (!tokenSupabase) {
          return throwError(() => new Error('Sessao do Supabase expirada.'));
        }
        return this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, null, {
          headers: { Authorization: `Bearer ${tokenSupabase}` }
        });
      }),
      tap((resposta) => this.aplicarSessao(resposta)),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  private aplicarSessao(resposta: LoginResponse): void {
    localStorage.setItem(CHAVE_TOKEN, resposta.token);
    localStorage.setItem(USER_KEY, JSON.stringify(resposta.usuario));

    this.usuarioLogado.set(resposta.usuario);

    const padrao = resposta.usuario.modulos.find(m => m.padrao)?.codigo
      ?? resposta.usuario.modulos[0]?.codigo
      ?? null;

    if (padrao) {
      this.currentModule.set(padrao.toLowerCase() as AppModule);
      localStorage.setItem(MODULE_KEY, padrao.toLowerCase());
      this.router.navigate([padrao.toLowerCase()]);
    }
  }

  setModule(module: AppModule): void {
    this.currentModule.set(module);
    localStorage.setItem(MODULE_KEY, module);
    this.router.navigate([module]);
  }

  logout(): void {
    supabase.auth.signOut();
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MODULE_KEY);
    this.usuarioLogado.set(null);
    this.currentModule.set(null);
    this.router.navigate(['login']);
  }

  private moduloExisteNaLista(codigo: string, modulos: ModuloDTO[]): boolean {
    return modulos.some(m => m.codigo.toLowerCase() === codigo.toLowerCase());
  }
}