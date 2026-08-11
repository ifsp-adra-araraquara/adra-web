import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../src/environments/environment';
import { Role } from '../shared/enum/role.enum';
import { AppModule } from '../shared/enum/module.enum';
import { DashboardType } from '../shared/enum/dashboard-type.enum';
import { LoginRequestDTO, UsuarioResponseDTO } from './auth.model';

interface PerfilConfig {
  nav: AppModule[];
  defaultPage: string;
  initials: string;
  dashType: DashboardType | null;
}

const PROFILES: Record<Role, PerfilConfig> = {
  [Role.ADMIN]: { nav: [AppModule.USUARIOS, AppModule.ACESSO, AppModule.NOTIFICACOES], defaultPage: AppModule.USUARIOS, initials: 'AD', dashType: null },
  [Role.COORD]: { nav: [AppModule.DASHBOARD, AppModule.ASSISTIDOS, AppModule.OFICINAS, AppModule.TURMAS, AppModule.CHAMADA, AppModule.DISCIPLINAR, AppModule.PRONTUARIOS], defaultPage: AppModule.DASHBOARD, initials: 'CO', dashType: DashboardType.COORDENADOR },
  [Role.SOCIO]: { nav: [AppModule.DASHBOARD, AppModule.CHAMADA, AppModule.ASSISTIDOS], defaultPage: AppModule.DASHBOARD, initials: 'SP', dashType: DashboardType.SOCIOPEDAGOGICO },
  [Role.PROFS]: { nav: [AppModule.DASHBOARD, AppModule.PRONTUARIOS, AppModule.ASSISTIDOS], defaultPage: AppModule.DASHBOARD, initials: 'PR', dashType: DashboardType.PROFISSIONAL_SAUDE },
  [Role.FINANCEIRO]: { nav: [AppModule.DASHBOARD, AppModule.ASSISTIDOS, AppModule.EXPORTACAO], defaultPage: AppModule.DASHBOARD, initials: 'FA', dashType: DashboardType.FINANCEIRO },
  [Role.OFICINEIRO]: { nav: [AppModule.MATERIAIS, AppModule.COMUNICADOS], defaultPage: AppModule.MATERIAIS, initials: 'OF', dashType: DashboardType.OFICINEIRO }
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${environment.apiUrl}/api/auth`;

  currentProfile = signal<Role | null>(null);
  currentModule = signal<AppModule | null>(null);

  // Agora vem do backend, não é mais um mapa fixo
  private usuarioLogado = signal<UsuarioResponseDTO | null>(null);


    private readonly USER_KEY = 'usuario_logado';
  private readonly PROFILE_KEY = 'perfil_logado';
  private readonly MODULE_KEY = 'modulo_atual';

constructor(private http: HttpClient) {
  // Restaura usuário
  const storedUser = localStorage.getItem(this.USER_KEY);
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      this.usuarioLogado.set(user);
    } catch {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  // Restaura perfil
  const storedProfile = localStorage.getItem(this.PROFILE_KEY);
  if (storedProfile) {
    const profile = storedProfile as Role;
    if (Object.values(Role).includes(profile)) {
      this.currentProfile.set(profile);
      // Restaura módulo atual (opcional)
      const storedModule = localStorage.getItem(this.MODULE_KEY);
      if (storedModule) {
        const mod = storedModule as AppModule;
        if (Object.values(AppModule).includes(mod)) {
          this.currentModule.set(mod);
        }
      }
    } else {
      localStorage.removeItem(this.PROFILE_KEY);
    }
  }
}


profileConfig = computed(() => {
    const p = this.currentProfile();
    return p ? PROFILES[p] : null;
  });

  dashType = computed(() => this.profileConfig()?.dashType ?? null);


currentUser = computed(() => {
  const u = this.usuarioLogado();
  return u ? { name: u.nomeCompleto, role: u.cargoFuncao ?? '' } : null;
});

login(email: string, senha: string): Observable<UsuarioResponseDTO> {
  const body: LoginRequestDTO = { email, senha };

  return this.http.post<UsuarioResponseDTO>(`${this.baseUrl}/login`, body).pipe(
    tap((resp) => {
      const perfil = this.mapNivelPermissaoParaRole(resp.nivelPermissao);
      if (!perfil) {
        throw new Error(`Nível de permissão desconhecido: ${resp.nivelPermissao}`);
      }
      // Atualiza signals
      this.usuarioLogado.set(resp);
      this.currentProfile.set(perfil);
      const config = PROFILES[perfil];
      this.currentModule.set(config.defaultPage as AppModule);

      // Persiste no localStorage
      localStorage.setItem(this.USER_KEY, JSON.stringify(resp));
      localStorage.setItem(this.PROFILE_KEY, perfil);
      localStorage.setItem(this.MODULE_KEY, config.defaultPage);
    }),
    catchError((err) => {
      this.logout();
      return throwError(() => err);
    })
  );
}
  private mapNivelPermissaoParaRole(nivel: string): Role | null {
    const match = Object.values(Role).find((r) => r === nivel);
    return (match as Role) ?? null;
  }

  setModule(module: AppModule): void {
    this.currentModule.set(module);
  }

  // auth.service.ts (trecho final)
logout(): void {
  // Limpa signals
  this.currentProfile.set(null);
  this.currentModule.set(null);
  this.usuarioLogado.set(null);
  
  // Remove do localStorage
  localStorage.removeItem(this.USER_KEY);
  localStorage.removeItem(this.PROFILE_KEY);
  localStorage.removeItem(this.MODULE_KEY);
}
}