import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, firstValueFrom, from, throwError } from 'rxjs';
import { switchMap, tap, catchError, filter, map } from 'rxjs/operators';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AppModule } from '../shared/enum/module.enum';
import { DashboardType } from '../shared/enum/dashboard-type.enum';
import { Role } from '../shared/enum/role.enum';
import { UsuarioResponse } from '../shared/models/usuarios/UsuarioResponse';
import { ModuloDTO } from '../shared/models/modulo/ModuloDTO';
import { InatividadeService } from './inatividade.service';
import { supabase } from './supabase.client';

export interface LoginResponse {
  token: string;
  usuario: UsuarioResponse;
}

const CHAVE_TOKEN = 'adra.token';
const USER_KEY = 'usuario_logado';

// Rotas publicas de autenticacao: nao devem reagir a INITIAL_SESSION/TOKEN_REFRESHED
// restaurando uma sessao antiga (ex: admin testando o link de convite/reset no
// mesmo navegador). Sem isso, o app "rouba" o usuario de volta pro dashboard
// antes da pagina de redefinir/convite conseguir renderizar.
const ROTAS_PUBLICAS_AUTH = ['/login', '/esqueci-senha', '/redefinir-senha'];

function sessaoRejeitada(erro: unknown): boolean {
  if (erro instanceof HttpErrorResponse) return erro.status === 401 || erro.status === 403;
  return !isAuthRetryableFetchError(erro);
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private inatividade = inject(InatividadeService);

  private url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  currentModule = computed<AppModule | null>(() => {
    const arvore = this.router.parseUrl(this.url());
    const segmento = arvore.root.children['primary']?.segments[0]?.path;
    if (segmento === 'oficineiro') return (arvore.queryParams['aba'] ?? AppModule.TURMAS) as AppModule;
    if (segmento === 'aulas') return AppModule.TURMAS;
    return (segmento ?? null) as AppModule | null;
  });
  private usuarioLogado = signal<UsuarioResponse | null>(null);

  private dashTypeMap: Record<Role, DashboardType | null> = {
    [Role.COORD]: DashboardType.COORDENADOR,
    [Role.ASSISTENTE]: null,
    [Role.EDUCADOR]: DashboardType.EDUCADOR_SOCIAL,
    [Role.OFICINEIRO]: null,
  };

  currentProfile = computed<Role | null>(() => this.usuarioLogado()?.nivelPermissao ?? null);

  currentUserResponse = computed<UsuarioResponse | null>(() => this.usuarioLogado());

  ehAdministrador = computed(() => this.usuarioLogado()?.administrador ?? false);

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
    if (this.inatividade.expirou()) {
      this.encerrarSessao();
    }

    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        const user: UsuarioResponse = JSON.parse(storedUser);
        this.usuarioLogado.set(user);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    supabase.auth.onAuthStateChange((evento, sessao) => {

      if (evento === 'PASSWORD_RECOVERY') return;

      // Nao interfere em paginas publicas de auth (login, esqueci-senha,
      // redefinir-senha): mesmo que exista uma sessao antiga
      // restaurada (ex: admin ja logado no mesmo navegador), essas telas
      // precisam renderizar normalmente sem ser "sequestradas" de volta pro
      // dashboard.
      const path = window.location.pathname;
      const emRotaPublica = ROTAS_PUBLICAS_AUTH.some(rota => path.startsWith(rota));
      if (emRotaPublica) return;

      // So resincroniza o token da API em segundo plano — NAO navega pra lugar
      // nenhum. Isso roda toda vez que o app carrega do zero com uma sessao
      // ja existente (ex.: abrir um link em outra guia, dar F5), entao forcar
      // navegacao pro modulo padrao aqui "sequestraria" o usuario de volta pra
      // fora da URL que ele acabou de abrir.
      const deveTrocar = evento === 'INITIAL_SESSION' || evento === 'TOKEN_REFRESHED';
      if (deveTrocar && sessao) {
        this.trocarPorTokenDaAplicacao(false).subscribe({ error: () => {} });
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

  async validarLinkEmail(tokenHash: string, tipo: 'recovery' | 'invite'): Promise<boolean> {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    return !error;
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

  /**
   * Troca a senha do usuário já logado (CA-FT2.4): exige a senha atual via
   * Supabase Auth e mantém a sessão ativa após atualizar.
   */
  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    const email = this.usuarioLogado()?.email;
    if (!email) {
      throw new Error('Sessão inválida. Faça login novamente.');
    }

    const { error: erroAtual } = await supabase.auth.signInWithPassword({
      email,
      password: senhaAtual,
    });
    if (erroAtual) {
      throw new Error('A senha atual está incorreta.');
    }

    const { error: erroAtualizacao } = await supabase.auth.updateUser({
      password: novaSenha,
    });
    if (erroAtualizacao) {
      throw new Error('Não foi possível alterar a senha. Tente novamente.');
    }
  }

  /**
   * Atualiza os dados editáveis do próprio usuário na sessão ativa (ex.: após
   * PUT /api/usuarios/me), preservando os módulos carregados no login.
   */
  atualizarDadosUsuarioLogado(parcial: Pick<UsuarioResponse, 'nomeCompleto' | 'telefone'>): void {
    const atual = this.usuarioLogado();
    if (!atual) return;
    const atualizado: UsuarioResponse = {
      ...atual,
      nomeCompleto: parcial.nomeCompleto,
      telefone: parcial.telefone,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(atualizado));
    this.usuarioLogado.set(atualizado);
  }

  /**
   * @param navegarParaModuloPadrao Quando true (padrao — usado no login
   * explicito), redireciona pro modulo padrao do usuario depois de trocar o
   * token. Quando false (usado na resincronizacao passiva em segundo plano,
   * disparada pelo listener de auth do Supabase), so atualiza o token/usuario
   * sem navegar, preservando a URL atual (ex.: um link de aula aberto em
   * outra guia).
   */
  trocarPorTokenDaAplicacao(navegarParaModuloPadrao: boolean = true): Observable<LoginResponse> {
    return from(supabase.auth.getSession()).pipe(
      switchMap(({ data, error }) => {
        const tokenSupabase = data.session?.access_token;
        if (!tokenSupabase) {
          return throwError(() => error ?? new Error('Sessao do Supabase expirada.'));
        }
        return this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, null, {
          headers: { Authorization: `Bearer ${tokenSupabase}` }
        });
      }),
      tap((resposta) => this.aplicarSessao(resposta, navegarParaModuloPadrao)),
      catchError((err) => {
        if (sessaoRejeitada(err)) {
          this.logout();
        }
        return throwError(() => err);
      })
    );
  }

  private aplicarSessao(resposta: LoginResponse, navegarParaModuloPadrao: boolean = true): void {
    if (!navegarParaModuloPadrao && !this.usuarioLogado()) {
      return;
    }

    localStorage.setItem(CHAVE_TOKEN, resposta.token);
    localStorage.setItem(USER_KEY, JSON.stringify(resposta.usuario));

    this.usuarioLogado.set(resposta.usuario);

    const padrao = resposta.usuario.modulos.find(m => m.padrao)?.codigo
      ?? resposta.usuario.modulos[0]?.codigo
      ?? null;

    if (!navegarParaModuloPadrao || !padrao) {
      return;
    }

    const modulo = padrao.toLowerCase() as AppModule;
    if (resposta.usuario.nivelPermissao === Role.OFICINEIRO) {
      this.router.navigate(['/oficineiro'], { queryParams: { aba: modulo } });
    } else {
      this.router.navigate([modulo]);
    }
  }

  setModule(module: AppModule): void {
    if (this.currentProfile() === Role.OFICINEIRO) {
      this.router.navigate(['/oficineiro'], { queryParams: { aba: module } });
      return;
    }
    
    this.router.navigate([module]);
  }

  logout(): void {
    this.encerrarSessao();
    this.router.navigate(['login']);
  }

  private encerrarSessao(): void {
    supabase.auth.signOut({ scope: 'local' });
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(USER_KEY);
    this.inatividade.limpar();
    this.usuarioLogado.set(null);
  }
}
