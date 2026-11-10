import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ArquivoService } from '../../../core/arquivo.service';
import { AuthService } from '../../../core/auth.service';
import { UsuarioService } from '../../../core/usuario.service';
import { CategoriaArquivo } from '../../../shared/enum/CategoriaArquivo';
import { EntidadeArquivo } from '../../../shared/enum/EntidadeArquivo';
import { Role } from '../../../shared/enum/role.enum';
import { ArquivoResponseDTO } from '../../../shared/models/arquivo/ArquivoResponseDTO';
import { UsuarioResponse } from '../../../shared/models/usuarios/UsuarioResponse';
import { MeuPerfil } from './meu-perfil';

const PERFIL_MOCK: UsuarioResponse = {
  usuarioId: 42,
  nomeCompleto: 'Maria Sociopedagógico',
  email: 'maria@adra.org.br',
  cargoFuncao: null,
  telefone: '19999990000',
  nivelPermissao: Role.ASSISTENTE,
  administrador: false,
  ativo: true,
  ultimoLogin: null,
  criadoEm: '2026-01-10T10:00:00Z',
  atualizadoEm: '2026-01-10T10:00:00Z',
  modulos: [],
};

const FOTO_MOCK: ArquivoResponseDTO = {
  arquivoId: 77,
  entidadeTipo: EntidadeArquivo.USUARIO,
  entidadeId: 42,
  categoria: CategoriaArquivo.FOTO_PERFIL,
  nomeOriginal: 'foto.jpg',
  mimeType: 'image/jpeg',
  tamanhoBytes: 12345,
  criadoEm: '2026-01-10T10:00:00Z',
  enviadoPorId: 42,
  enviadoPorNome: 'Maria Sociopedagógico',
};

describe('MeuPerfil', () => {
  let fixture: ComponentFixture<MeuPerfil>;
  let component: MeuPerfil;
  let usuarioServiceMock: {
    buscarMeuPerfil: ReturnType<typeof vi.fn>;
    atualizarMeuPerfil: ReturnType<typeof vi.fn>;
  };
  let arquivoServiceMock: {
    listar: ReturnType<typeof vi.fn>;
    enviar: ReturnType<typeof vi.fn>;
    remover: ReturnType<typeof vi.fn>;
    invalidarFotoPerfil: ReturnType<typeof vi.fn>;
    solicitarFotoPerfil: ReturnType<typeof vi.fn>;
    versaoFotoPerfil: ReturnType<typeof vi.fn>;
  };
  let authServiceMock: {
    atualizarDadosUsuarioLogado: ReturnType<typeof vi.fn>;
    alterarSenha: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    usuarioServiceMock = {
      buscarMeuPerfil: vi.fn().mockReturnValue(of(PERFIL_MOCK)),
      atualizarMeuPerfil: vi.fn().mockImplementation((dto) =>
        of({
          ...PERFIL_MOCK,
          nomeCompleto: dto.nomeCompleto,
          telefone: dto.telefone,
        }),
      ),
    };

    arquivoServiceMock = {
      listar: vi.fn().mockResolvedValue([FOTO_MOCK]),
      enviar: vi.fn().mockResolvedValue(FOTO_MOCK),
      remover: vi.fn().mockResolvedValue(undefined),
      invalidarFotoPerfil: vi.fn(),
      solicitarFotoPerfil: vi.fn().mockResolvedValue('https://exemplo.com/foto.jpg'),
      versaoFotoPerfil: vi.fn().mockReturnValue(0),
    };

    authServiceMock = {
      atualizarDadosUsuarioLogado: vi.fn(),
      alterarSenha: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [MeuPerfil],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UsuarioService, useValue: usuarioServiceMock },
        { provide: ArquivoService, useValue: arquivoServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MeuPerfil);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('carrega os dados de /api/usuarios/me e exibe e-mail e perfil somente leitura com indicação do Administrador', () => {
    expect(usuarioServiceMock.buscarMeuPerfil).toHaveBeenCalled();
    expect(component.nomeCompleto()).toBe('Maria Sociopedagógico');
    expect(component.telefone()).toBe('19999990000');
    expect(component.rotuloPerfil()).toBe('Sociopedagógico');

    const textoPagina = fixture.nativeElement.textContent as string;
    expect(textoPagina).toContain('maria@adra.org.br');
    expect(textoPagina).toContain('Sociopedagógico');
    expect(textoPagina).toContain('Administrador');
  });

  it('atualiza nome e telefone no PUT /api/usuarios/me e sincroniza o usuário logado', async () => {
    component.nomeCompleto.set('Maria Silva');
    component.telefone.set('(19) 98888-7777');

    await component.salvarDadosPessoais();

    expect(usuarioServiceMock.atualizarMeuPerfil).toHaveBeenCalledWith({
      nomeCompleto: 'Maria Silva',
      telefone: '19988887777',
    });
    expect(authServiceMock.atualizarDadosUsuarioLogado).toHaveBeenCalledWith({
      nomeCompleto: 'Maria Silva',
      telefone: '19988887777',
    });
    expect(component.sucessoDados()).toBe('Dados atualizados com sucesso.');
  });

  it('só envia a nova foto e invalida o cache da barra lateral ao salvar os dados pessoais (CA-FT2.3)', async () => {
    const arquivoFalso = new File(['conteudo'], 'nova.jpg', { type: 'image/jpeg' });
    component.novaFoto.set(arquivoFalso);

    expect(arquivoServiceMock.enviar).not.toHaveBeenCalled();
    expect(arquivoServiceMock.invalidarFotoPerfil).not.toHaveBeenCalled();

    await component.salvarDadosPessoais();

    expect(arquivoServiceMock.enviar).toHaveBeenCalledWith(
      EntidadeArquivo.USUARIO,
      42,
      CategoriaArquivo.FOTO_PERFIL,
      arquivoFalso,
    );
    expect(arquivoServiceMock.invalidarFotoPerfil).toHaveBeenCalledWith(
      EntidadeArquivo.USUARIO,
      42,
      true,
    );
    expect(component.novaFoto()).toBeNull();
  });

  it('só remove a foto atual no servidor e invalida o cache da barra lateral ao salvar (CA-FT2.3)', async () => {
    component.marcarRemocaoFoto();

    expect(component.removerFotoAtual()).toBe(true);
    expect(arquivoServiceMock.remover).not.toHaveBeenCalled();

    await component.salvarDadosPessoais();

    expect(arquivoServiceMock.remover).toHaveBeenCalledWith(77);
    expect(arquivoServiceMock.invalidarFotoPerfil).toHaveBeenCalledWith(
      EntidadeArquivo.USUARIO,
      42,
      true,
    );
    expect(component.fotoSalva()).toBeNull();
  });

  it('valida senha atual, política de força e confirmação antes de trocar a senha (CA-FT2.4)', async () => {
    await component.salvarNovaSenha();
    expect(component.erroSenha()).toBe('Informe a senha atual.');

    component.senhaAtual.set('SenhaAtual123');
    component.novaSenha.set('fraca');
    component.confirmarSenha.set('fraca');
    await component.salvarNovaSenha();
    expect(component.erroSenha()).toContain('8 caracteres');

    component.novaSenha.set('SenhaForte123');
    component.confirmarSenha.set('OutraSenha123');
    await component.salvarNovaSenha();
    expect(component.erroSenha()).toBe('As senhas não coincidem.');
    expect(authServiceMock.alterarSenha).not.toHaveBeenCalled();

    component.confirmarSenha.set('SenhaForte123');
    await component.salvarNovaSenha();
    expect(authServiceMock.alterarSenha).toHaveBeenCalledWith('SenhaAtual123', 'SenhaForte123');
    expect(component.sucessoSenha()).toBe('Senha alterada com sucesso.');
    expect(component.senhaAtual()).toBe('');
    expect(component.novaSenha()).toBe('');
    expect(component.confirmarSenha()).toBe('');
  });

  it('exibe mensagem clara quando a senha atual está incorreta (CA-FT2.4)', async () => {
    authServiceMock.alterarSenha.mockRejectedValueOnce(new Error('A senha atual está incorreta.'));

    component.senhaAtual.set('SenhaErrada123');
    component.novaSenha.set('SenhaForte123');
    component.confirmarSenha.set('SenhaForte123');

    await component.salvarNovaSenha();

    expect(component.erroSenha()).toBe('A senha atual está incorreta.');
    expect(component.sucessoSenha()).toBeNull();
  });
});
