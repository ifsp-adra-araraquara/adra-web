import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichaDisciplinarAssistido } from './ficha-disciplinar-assistido';
import { AuthService } from '../../../../core/auth.service';
import { DisciplinarService } from '../../../../core/disciplinar.service';
import { Role } from '../../../../shared/enum/role.enum';
import { NivelDisciplinar } from '../../../../shared/enum/NivelDisciplinar';
import { FichaDisciplinarDTO, RegistroDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';

const registro = {
  registroId: 1,
  assistidoId: 7,
  nomeAssistido: 'Lucas Martins',
  motivo: 'Falar palavrão',
  nivel: NivelDisciplinar.OCORRENCIA,
  origem: 'MANUAL',
  sequencia: 1,
  dataRegistro: '2026-10-20',
  arquivado: false,
} as RegistroDisciplinarDTO;

const advertenciaPendente = {
  ...registro,
  registroId: 2,
  nivel: NivelDisciplinar.ADVERTENCIA,
  motivo: 'Agressão',
  documentoStatus: 'PENDENTE_ASSINATURA',
} as RegistroDisciplinarDTO;

const ficha: FichaDisciplinarDTO = {
  resumo: {
    ocorrenciasAtivas: 1,
    advertenciasAtivas: 0,
    suspensoesAtivas: 0,
    uniformeAtivas: 0,
    faltamParaAdvertencia: 2,
    faltamParaSuspensao: 3,
    faltamParaPerderPasseio: 3,
    faltamParaRetornoComResponsavel: 3,
    suspensoAte: null,
    retornoComResponsavelPendente: false,
    perdeProximoPasseio: false,
    documentosPendentes: 0,
  },
  registros: [advertenciaPendente, registro],
};

async function montar(perfil: Role): Promise<ComponentFixture<FichaDisciplinarAssistido>> {
  await TestBed.configureTestingModule({
    imports: [FichaDisciplinarAssistido],
    providers: [
      { provide: AuthService, useValue: { currentProfile: signal(perfil) } },
      { provide: DisciplinarService, useValue: { buscarFicha: vi.fn().mockResolvedValue(ficha) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(FichaDisciplinarAssistido);
  fixture.componentRef.setInput('assistidoId', 7);
  fixture.componentRef.setInput('nome', 'Lucas Martins');
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function temBotaoZerar(fixture: ComponentFixture<FichaDisciplinarAssistido>): boolean {
  return (fixture.nativeElement as HTMLElement).textContent?.includes('Zerar contagem') ?? false;
}

describe('FichaDisciplinarAssistido', () => {
  it('mostra "Zerar contagem" para o Coordenador', async () => {
    const fixture = await montar(Role.COORD);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('1ª ocorrência');
    expect(temBotaoZerar(fixture)).toBe(true);
  });

  it('esconde "Zerar contagem" dos outros perfis', async () => {
    expect(temBotaoZerar(await montar(Role.EDUCADOR))).toBe(false);
  });

  it('FT-25: Coordenador imprime e anexa o assinado de documento pendente', async () => {
    const texto = (await montar(Role.COORD)).nativeElement.textContent as string;
    expect(texto).toContain('Documento a assinar');
    expect(texto).toContain('Imprimir');
    expect(texto).toContain('Anexar assinado');
  });

  it('FT-25: Educador Social só imprime', async () => {
    const texto = (await montar(Role.EDUCADOR)).nativeElement.textContent as string;
    expect(texto).toContain('Imprimir');
    expect(texto).not.toContain('Anexar assinado');
  });
});
