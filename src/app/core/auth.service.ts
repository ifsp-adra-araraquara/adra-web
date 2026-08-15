import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../src/environments/environment';
import { AppModule } from '../shared/enum/module.enum';
import { DashboardType } from '../shared/enum/dashboard-type.enum';
import { LoginRequestDTO, UsuarioResponseDTO, ModuloDTO } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${environment.apiUrl}/api/auth`;

  currentModule = signal<AppModule | null>(null);
  private usuarioLogado = signal<UsuarioResponseDTO | null>(null);

  private readonly USER_KEY = 'usuario_logado';
  private readonly MODULE_KEY = 'modulo_atual';

  private dashTypeMap: Record<string, DashboardType | null> = {
    'ADMINISTRADOR': null,
    'COORDENADOR': DashboardType.COORDENADOR,
    'SOCIOPEDAGOGICO': DashboardType.SOCIOPEDAGOGICO,
    'PROFISSIONAL_SAUDE': DashboardType.PROFISSIONAL_SAUDE,
    'FINANCEIRO': DashboardType.FINANCEIRO,
    'OFICINEIRO': null,
  };

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem(this.USER_KEY);
    if (storedUser) {
      try {
        const user: UsuarioResponseDTO = JSON.parse(storedUser);
        this.usuarioLogado.set(user);

        const storedModule = localStorage.getItem(this.MODULE_KEY);
        if (storedModule && this.moduloExisteNaLista(storedModule, user.modulos)) {
          this.currentModule.set(storedModule as AppModule);
        } else {
          const padrao = user.modulos.find(m => m.padrao)?.codigo ?? user.modulos[0]?.codigo ?? null;
          if (padrao) this.currentModule.set(padrao as AppModule);
        }
      } catch {
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  modulos = computed<ModuloDTO[]>(() => this.usuarioLogado()?.modulos ?? []);

  dashType = computed<DashboardType | null>(() => {
    const nivel = this.usuarioLogado()?.nivelPermissao;
    return nivel ? this.dashTypeMap[nivel] ?? null : null;
  });

  currentUser = computed(() => {
    const u = this.usuarioLogado();
    return u ? { name: u.nomeCompleto, role: u.cargoFuncao ?? '' } : null;
  });

  login(email: string, senha: string): Observable<UsuarioResponseDTO> {
    const body: LoginRequestDTO = { email, senha };

    return this.http.post<UsuarioResponseDTO>(`${this.baseUrl}/login`, body).pipe(
      tap((resp) => {
        this.usuarioLogado.set(resp);

        const padrao = resp.modulos.find(m => m.padrao)?.codigo ?? resp.modulos[0]?.codigo ?? null;
        if (padrao) {
          this.currentModule.set(padrao.toLowerCase() as AppModule);
          localStorage.setItem(this.MODULE_KEY, padrao.toLowerCase());
        }

        localStorage.setItem(this.USER_KEY, JSON.stringify(resp));
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  setModule(module: AppModule): void {
    this.currentModule.set(module);
    localStorage.setItem(this.MODULE_KEY, module);
  }

  logout(): void {
    this.currentModule.set(null);
    this.usuarioLogado.set(null);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.MODULE_KEY);
  }

  private moduloExisteNaLista(codigo: string, modulos: ModuloDTO[]): boolean {
      return modulos.some(m => m.codigo.toLowerCase() === codigo.toLowerCase());
    } 
}