import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { RegistroDisciplinarModal } from './registro-disciplinar-modal';
import { AuthService } from '../../../core/auth.service';
import { DisciplinarService } from '../../../core/disciplinar.service';
import { Role } from '../../enum/role.enum';
import { NivelDisciplinar } from '../../enum/NivelDisciplinar';
import { RegistroDisciplinarDTO } from '../../models/disciplinar/Disciplinar';

const motivo = { motivoId: 1, nome: 'Falar palavrão', nivel: NivelDisciplinar.OCORRENCIA, ativo: true };
const lucas = { assistidoId: 7, nomeCompleto: 'Lucas Martins' };
const ana = { assistidoId: 8, nomeCompleto: 'Ana Souza' };

function criado(assistidoId: number) {
  return {
    registro: { registroId: assistidoId, assistidoId, nivel: NivelDisciplinar.OCORRENCIA, sequencia: 1 } as RegistroDisciplinarDTO,
    recomendacao: null,
  };
}

async function montar(servico: Partial<DisciplinarService>) {
  await TestBed.configureTestingModule({
    imports: [RegistroDisciplinarModal],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: AuthService, useValue: { currentProfile: signal(Role.COORD) } },
      { provide: DisciplinarService, useValue: { listarMotivos: vi.fn().mockResolvedValue([motivo]), ...servico } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(RegistroDisciplinarModal);
  fixture.componentInstance.open.set(true);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('RegistroDisciplinarModal', () => {
  it('com vários atendidos escolhidos, registra todos de uma vez', async () => {
    const registrarVarios = vi.fn().mockResolvedValue([criado(7), criado(8)]);
    const registrar = vi.fn();
    const fixture = await montar({ registrarVarios, registrar });
    const modal = fixture.componentInstance;

    modal.escolherAssistido(lucas);
    modal.escolherAssistido(ana);
    modal.escolherAssistido(lucas); // repetido não entra de novo
    modal.motivoId.set(1);
    modal.descricao.set('Briga no intervalo');
    fixture.detectChanges();

    expect(modal.escolhidos().length).toBe(2);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.escolhido-chip').length).toBe(2);

    await modal.registrar();

    expect(registrar).not.toHaveBeenCalled();
    expect(registrarVarios).toHaveBeenCalledWith(
      expect.objectContaining({ assistidoIds: [7, 8], motivoId: 1, descricao: 'Briga no intervalo' }),
    );
  });

  it('com um atendido só, usa o registro individual', async () => {
    const registrar = vi.fn().mockResolvedValue(criado(7));
    const registrarVarios = vi.fn();
    const fixture = await montar({ registrar, registrarVarios });
    const modal = fixture.componentInstance;

    modal.escolherAssistido(lucas);
    modal.motivoId.set(1);
    modal.descricao.set('Fato');
    await modal.registrar();

    expect(registrarVarios).not.toHaveBeenCalled();
    expect(registrar).toHaveBeenCalledWith(7, expect.objectContaining({ motivoId: 1 }));
  });

  it('remover um chip tira o atendido da lista', async () => {
    const fixture = await montar({});
    const modal = fixture.componentInstance;
    modal.escolherAssistido(lucas);
    modal.escolherAssistido(ana);

    modal.removerAssistido(lucas);

    expect(modal.escolhidos()).toEqual([ana]);
  });
});
