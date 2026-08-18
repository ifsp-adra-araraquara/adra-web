import { HttpClient } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, from, throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Role } from '../shared/enum/role.enum';
import { ROLE_LABELS } from '../shared/enum/role-labels';
import { AppModule } from '../shared/enum/module.enum';
import { DashboardType } from '../shared/enum/dashboard-type.enum';
import { supabase } from './supabase.client';

interface PerfilConfig {
  nav: AppModule[];
  defaultPage: string;
  initials: string;
  dashType: DashboardType | null;
}

const PROFILES: Record<Role, PerfilConfig> = {

  [Role.ADMIN]: {
    nav: [AppModule.USUARIOS, AppModule.ACESSO, AppModule.NOTIFICACOES],
    defaultPage: AppModule.USUARIOS,
    initials: 'AD',
    dashType: null
  },

  [Role.COORD]: {
    nav: [
      AppModule.DASHBOARD, AppModule.ASSISTIDOS, AppModule.OFICINAS,
      AppModule.TURMAS, AppModule.CHAMADA, AppModule.DISCIPLINAR, AppModule.PRONTUARIOS
    ],
    defaultPage: AppModule.DASHBOARD,
    initials: 'CO',
    dashType: DashboardType.COORDENADOR
  },

  [Role.SOCIO]: {
    nav: [AppModule.DASHBOARD, AppModule.CHAMADA, AppModule.ASSISTIDOS],
    defaultPage: AppModule.DASHBOARD,
    initials: 'SP',
    dashType: DashboardType.SOCIOPEDAGOGICO
  },

  [Role.NEURO]: {
    nav: [AppModule.DASHBOARD, AppModule.PRONTUARIOS, AppModule.ASSISTIDOS],
    defaultPage: AppModule.DASHBOARD,
    initials: 'NE',
    dashType: DashboardType.NEUROLOGIA
  },

  [Role.PSICO]: {
    nav: [AppModule.DASHBOARD, AppModule.PRONTUARIOS, AppModule.ASSISTIDOS],
    defaultPage: AppModule.DASHBOARD,
    initials: 'PP',
    dashType: DashboardType.PSICOPEDAGOGA
  },

  [Role.FINANCEIRO]: {
    nav: [AppModule.DASHBOARD, AppModule.ASSISTIDOS, AppModule.EXPORTACAO],
    defaultPage: AppModule.DASHBOARD,
    initials: 'FA',
    dashType: DashboardType.FINANCEIRO
  },

  [Role.OFICINEIRO]: {
    nav: [AppModule.MATERIAIS, AppModule.COMUNICADOS],
    defaultPage: AppModule.MATERIAIS,
    initials: 'OF',
    dashType: DashboardType.OFICINEIRO
  }
};

/** Espelha o UsuarioResponseDTO da API. */
export interface Usuario {
  usuarioId: number;
  nomeCompleto: string;
  email: string;
  nivelPermissao: Role;
  cargoFuncao: string | null;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

const USERS: Record<Role, { name: string; role: string }> = {
  [Role.ADMIN]:      { name: 'Carlos Mendes',      role: 'Administrador do sistema' },
  [Role.COORD]:      { name: 'Juliana Alves',      role: 'Coordenação geral' },
  [Role.SOCIO]:      { name: 'Marcos Pereira',     role: 'Equipe sociopedagógica' },
  [Role.NEURO]:      { name: 'Dra. Letícia Prado', role: 'Neurologia' },
  [Role.PSICO]:      { name: 'Psic. Renata Dias',  role: 'Psicopedagogia' },
  [Role.FINANCEIRO]: { name: 'Sandra Lopes',       role: 'Financeiro / Administrativo' },
  [Role.OFICINEIRO]: { name: 'Bruno Carvalho',     role: 'Oficineiro — Música' },
};

const CHAVE_TOKEN = 'adra.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentProfile = signal<Role | null>(null);
  usuario = signal<Usuario | null>(null);

  // NOVO: Controla qual módulo/página do menu está selecionado no momento
  currentModule = signal<AppModule | null>(null);

  profileConfig = computed(() => {
    const p = this.currentProfile();
    return p ? PROFILES[p] : null;
  });

  currentUser = computed(() => {
    const u = this.usuario();
    const p = this.currentProfile();
    if (u) {
      return { name: u.nomeCompleto, role: u.cargoFuncao ?? ROLE_LABELS[u.nivelPermissao] };
    }
    return p ? USERS[p] : null;
  });

  dashType = computed(() => this.profileConfig()?.dashType ?? null);

  constructor() {
    // INITIAL_SESSION restaura a sessao ao recarregr pagina; TOKEN_REFRESHED
    // acompanha a renovacao do supabase-js, senoa o nosso token expira antes.
    supabase.auth.onAuthStateChange((evento, sessao) => {
      const deveTrocar = evento === 'INITIAL_SESSION' || evento === 'TOKEN_REFRESHED';
      if (deveTrocar && sessao) {
        this.trocarPorTokenDaAplicacao().subscribe({ error: () => this.logout() });
      }
    });
  }

  get token(): string | null {
    return localStorage.getItem(CHAVE_TOKEN);
  }

  async login(email: string, senha: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      throw new Error('E-mail ou senha invalidos.');
    }
    await firstValueFrom(this.trocarPorTokenDaAplicacao());
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
      tap((resposta) => this.aplicarSessao(resposta))
    );
  }

  private aplicarSessao(resposta: LoginResponse): void {
    localStorage.setItem(CHAVE_TOKEN, resposta.token);
    this.usuario.set(resposta.usuario);
    this.currentProfile.set(resposta.usuario.nivelPermissao);
    this.currentModule.set(PROFILES[resposta.usuario.nivelPermissao].defaultPage as AppModule);
  }

  // NOVO: Método para alterar o módulo ativo ao clicar no menu
  setModule(module: AppModule): void {
    this.currentModule.set(module);
  }

  logout(): void {
    supabase.auth.signOut();
    localStorage.removeItem(CHAVE_TOKEN);
    this.usuario.set(null);
    this.currentProfile.set(null);
    this.currentModule.set(null);
    this.router.navigate(['login']);
  }
}