import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecomendacaoDisciplinarModal } from './recomendacao-disciplinar-modal';
import { AuthService } from '../../../core/auth.service';
import { DisciplinarService } from '../../../core/disciplinar.service';
import { Role } from '../../enum/role.enum';
import { NivelDisciplinar } from '../../enum/NivelDisciplinar';
import { RegistroDisciplinarDTO } from '../../models/disciplinar/Disciplinar';

const recomendacao = {
  registroId: 3,
  assistidoId: 7,
  nomeAssistido: 'Lucas Martins',
  motivo: 'Falar palavrão',
  nivel: NivelDisciplinar.OCORRENCIA,
  origem: 'MANUAL',
  sequencia: 3,
  consequencia: 'RECOMENDA_ADVERTENCIA',
  consequenciaPendente: true,
  arquivado: false,
} as RegistroDisciplinarDTO;

async function montar(perfil: Role, gerarPelaRecomendacao = vi.fn()) {
  await TestBed.configureTestingModule({
    imports: [RecomendacaoDisciplinarModal],
    providers: [
      { provide: AuthService, useValue: { currentProfile: signal(perfil) } },
      { provide: DisciplinarService, useValue: { gerarPelaRecomendacao } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(RecomendacaoDisciplinarModal);
  fixture.componentRef.setInput('recomendacoes', [recomendacao]);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function texto(fixture: ComponentFixture<RecomendacaoDisciplinarModal>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

function clicar(fixture: ComponentFixture<RecomendacaoDisciplinarModal>, rotulo: string): void {
  const botao = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
    b.textContent?.includes(rotulo),
  );
  botao!.click();
  fixture.detectChanges();
}

describe('RecomendacaoDisciplinarModal', () => {
  it('mostra o texto da Cartilha', async () => {
    const fixture = await montar(Role.COORD);
    expect(texto(fixture)).toContain(
      'Lucas Martins chegou a 3 ocorrências ativas. A Cartilha recomenda advertência escrita.',
    );
  });

  it('Coordenador pode gerar a advertência agora ou deixar para depois', async () => {
    const fixture = await montar(Role.COORD);
    expect(texto(fixture)).toContain('Gerar advertência agora');
    expect(texto(fixture)).toContain('Agora não');
    expect(texto(fixture)).not.toContain('A coordenação foi avisada');
  });

  it('Educador Social só toma ciência', async () => {
    const fixture = await montar(Role.EDUCADOR);
    expect(texto(fixture)).toContain('Entendi');
    expect(texto(fixture)).toContain('A coordenação foi avisada');
    expect(texto(fixture)).not.toContain('Gerar advertência');
  });

  it('gera pela recomendação com a data e a descrição do formulário', async () => {
    const gerar = vi.fn().mockResolvedValue({ registro: { ...recomendacao, registroId: 9 }, recomendacao: null });
    const fixture = await montar(Role.COORD, gerar);

    clicar(fixture, 'Gerar advertência agora');
    clicar(fixture, 'Gerar advertência');
    await fixture.whenStable();

    expect(gerar).toHaveBeenCalledWith(3, expect.objectContaining({ descricao: expect.stringContaining('3ª ocorrência') }));
    fixture.detectChanges();
    expect(texto(fixture)).not.toContain('Lucas Martins chegou');
  });
});
