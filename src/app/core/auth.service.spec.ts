import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthRetryableFetchError } from '@supabase/supabase-js';

import { AuthService } from './auth.service';
import { supabase } from './supabase.client';

const USUARIO = JSON.stringify({ id: 10, nomeCompleto: 'Ana', email: 'ana@adra.org.br', cargoFuncao: 'Coordenadora', modulos: [] });
const MAIS_DE_240_MINUTOS_MS = 241 * 60_000;

describe('AuthService', () => {
  let signOut: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    signOut = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({} as never);
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null } as never);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'login', children: [] }])] });
  });

  afterEach(() => vi.restoreAllMocks());

  async function falharTrocaDeToken(status: number): Promise<AuthService> {
    localStorage.setItem('usuario_logado', USUARIO);
    const auth = TestBed.inject(AuthService);
    auth.trocarPorTokenDaAplicacao(false).subscribe({ error: () => {} });
    await Promise.resolve();
    await Promise.resolve();
    TestBed.inject(HttpTestingController)
      .expectOne((requisicao) => requisicao.url.endsWith('/api/auth/login'))
      .flush(null, { status, statusText: 'erro' });
    return auth;
  }

  it('erro temporário na troca de token mantém a sessão', async () => {
    const auth = await falharTrocaDeToken(503);

    expect(signOut).not.toHaveBeenCalled();
    expect(auth.currentUser()).not.toBeNull();
  });

  it('token recusado desloga só neste dispositivo', async () => {
    const auth = await falharTrocaDeToken(401);

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(auth.currentUser()).toBeNull();
  });

  it('Supabase Auth fora do ar mantém a sessão', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('fora do ar', 503),
    } as never);
    localStorage.setItem('usuario_logado', USUARIO);
    const auth = TestBed.inject(AuthService);

    auth.trocarPorTokenDaAplicacao(false).subscribe({ error: () => {} });
    await Promise.resolve();
    await Promise.resolve();

    expect(signOut).not.toHaveBeenCalled();
    expect(auth.currentUser()).not.toBeNull();
  });

  it('sessão do Supabase ausente desloga', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never);
    localStorage.setItem('usuario_logado', USUARIO);
    const auth = TestBed.inject(AuthService);

    auth.trocarPorTokenDaAplicacao(false).subscribe({ error: () => {} });
    await Promise.resolve();
    await Promise.resolve();

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('troca de token em segundo plano não restaura sessão encerrada', async () => {
    localStorage.setItem('adra.ultima-atividade', String(Date.now() - MAIS_DE_240_MINUTOS_MS));
    const auth = TestBed.inject(AuthService);

    auth.trocarPorTokenDaAplicacao(false).subscribe();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.inject(HttpTestingController)
      .expectOne((requisicao) => requisicao.url.endsWith('/api/auth/login'))
      .flush({ token: 'novo', usuario: JSON.parse(USUARIO) });

    expect(auth.currentUser()).toBeNull();
    expect(auth.token).toBeNull();
    expect(localStorage.getItem('usuario_logado')).toBeNull();
  });

  it('sessão inativa é encerrada ao abrir o sistema', () => {
    localStorage.setItem('usuario_logado', USUARIO);
    localStorage.setItem('adra.token', 'token');
    localStorage.setItem('adra.ultima-atividade', String(Date.now() - MAIS_DE_240_MINUTOS_MS));

    const auth = TestBed.inject(AuthService);

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(auth.currentUser()).toBeNull();
    expect(auth.token).toBeNull();
  });

  it('alterarSenha rejeita com mensagem clara quando a senha atual está incorreta e não altera a senha', async () => {
    localStorage.setItem('usuario_logado', USUARIO);
    const signIn = vi
      .spyOn(supabase.auth, 'signInWithPassword')
      .mockResolvedValue({ data: { user: null, session: null }, error: new Error('Invalid login credentials') } as never);
    const updateUser = vi.spyOn(supabase.auth, 'updateUser').mockResolvedValue({ data: { user: {} }, error: null } as never);
    const auth = TestBed.inject(AuthService);

    await expect(auth.alterarSenha('SenhaErrada123', 'NovaSenhaForte123')).rejects.toThrow('A senha atual está incorreta.');

    expect(signIn).toHaveBeenCalledWith({ email: 'ana@adra.org.br', password: 'SenhaErrada123' });
    expect(updateUser).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(auth.currentUser()?.name).toBe('Ana');
  });

  it('alterarSenha valida a senha atual, atualiza a senha no Supabase e mantém a sessão ativa', async () => {
    localStorage.setItem('usuario_logado', USUARIO);
    const signIn = vi
      .spyOn(supabase.auth, 'signInWithPassword')
      .mockResolvedValue({ data: { user: {}, session: {} }, error: null } as never);
    const updateUser = vi.spyOn(supabase.auth, 'updateUser').mockResolvedValue({ data: { user: {} }, error: null } as never);
    const auth = TestBed.inject(AuthService);

    await auth.alterarSenha('SenhaAtual123', 'NovaSenhaForte123');

    expect(signIn).toHaveBeenCalledWith({ email: 'ana@adra.org.br', password: 'SenhaAtual123' });
    expect(updateUser).toHaveBeenCalledWith({ password: 'NovaSenhaForte123' });
    expect(signOut).not.toHaveBeenCalled();
    expect(auth.currentUser()?.name).toBe('Ana');
  });

  it('atualizarDadosUsuarioLogado sincroniza currentUser e localStorage', () => {
    localStorage.setItem('usuario_logado', USUARIO);
    const auth = TestBed.inject(AuthService);

    auth.atualizarDadosUsuarioLogado({ nomeCompleto: 'Ana Atualizada', telefone: '19988887777' });

    expect(auth.currentUser()?.name).toBe('Ana Atualizada');
    const salvo = JSON.parse(localStorage.getItem('usuario_logado')!);
    expect(salvo.nomeCompleto).toBe('Ana Atualizada');
    expect(salvo.telefone).toBe('19988887777');
  });
});
