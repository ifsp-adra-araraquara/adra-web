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
const lucas = { assistidoId: 7, nomeCompleto: 'Lucas Martins', totalOcorrenciasAtivas: 2 };
const ana = { assistidoId: 8, nomeCompleto: 'Ana Souza', totalOcorrenciasAtivas: 0 };

function criado(assistidoId: number) {
  return {
    registro: {
      registroId: assistidoId,
      assistidoId,
      nomeAssistido: assistidoId === 7 ? 'Lucas Martins' : 'Ana Souza',
      nivel: NivelDisciplinar.OCORRENCIA,
      sequencia: 1,
    } as RegistroDisciplinarDTO,
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

    modal.escolhidos.set([lucas, ana]);
    modal.motivoId.set(1);
    modal.descricao.set('Briga no intervalo');
    fixture.detectChanges();

    expect(modal.rotuloRegistrar()).toBe('Registrar para 2 atendidos');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.envolvido').length).toBe(2);

    await modal.registrar();

    expect(registrar).not.toHaveBeenCalled();
    expect(registrarVarios).toHaveBeenCalledWith(
      expect.objectContaining({ assistidoIds: [7, 8], motivoId: 1, descricao: 'Briga no intervalo' }),
    );
    expect(modal.confirmacao()).toBe('Ocorrência registrada para Lucas M. e Ana S.');
  });

  it('com um atendido só, usa o registro individual', async () => {
    const registrar = vi.fn().mockResolvedValue(criado(7));
    const registrarVarios = vi.fn();
    const fixture = await montar({ registrar, registrarVarios });
    const modal = fixture.componentInstance;

    modal.escolhidos.set([lucas]);
    modal.motivoId.set(1);
    modal.descricao.set('Fato');
    await modal.registrar();

    expect(registrarVarios).not.toHaveBeenCalled();
    expect(registrar).toHaveBeenCalledWith(7, expect.objectContaining({ motivoId: 1 }));
  });

  it('remover um envolvido tira o atendido da lista', async () => {
    const modal = (await montar({})).componentInstance;
    modal.escolhidos.set([lucas, ana]);

    modal.removerAssistido(lucas);

    expect(modal.escolhidos()).toEqual([ana]);
  });

  it('no celular, só avança para "O que aconteceu?" com alguém escolhido', async () => {
    const modal = (await montar({})).componentInstance;
    modal.largo.set(false);

    modal.continuar();
    expect(modal.passo()).toBe('quem');
    expect(modal.erro()).toBe('Escolha ao menos um atendido.');

    modal.escolhidos.set([lucas]);
    modal.continuar();
    expect(modal.passo()).toBe('oque');
    expect(modal.erro()).toBeNull();
  });

  it('a prévia avisa quem vai chegar à 3ª e o que a Cartilha recomenda', async () => {
    const modal = (await montar({})).componentInstance;
    modal.escolhidos.set([lucas, ana]);
    modal.motivoId.set(1);

    expect(modal.previa()).toEqual([
      { atendido: lucas, registro: '3ª ocorrência', recomendacao: 'advertência escrita' },
      { atendido: ana, registro: '1ª ocorrência', recomendacao: null },
    ]);
  });

  it('"Hoje" e "Ontem" escolhem a data sem abrir o calendário', async () => {
    const modal = (await montar({})).componentInstance;

    modal.escolherData(modal.ontem);
    expect(modal.data()).toBe(modal.ontem);
    expect(modal.outraData()).toBe(false);

    modal.outraData.set(true);
    modal.escolherData(modal.hoje);
    expect(modal.data()).toBe(modal.hoje);
    expect(modal.outraData()).toBe(false);
  });

  it('suspensão com um atendido usa o período em dias de atividade do grupo (reunião de 05/11)', async () => {
    const suspensao = { motivoId: 9, nome: 'Bullying', nivel: NivelDisciplinar.SUSPENSAO, ativo: true };
    const sugerirPeriodoSuspensao = vi
      .fn()
      .mockResolvedValue({ inicio: '2026-11-06', fim: '2026-11-10', diasDeAtividade: 3, retorno: '2026-11-11' });
    const fixture = await montar({
      listarMotivos: vi.fn().mockResolvedValue([motivo, suspensao]),
      sugerirPeriodoSuspensao,
    });
    const modal = fixture.componentInstance;

    modal.escolhidos.set([lucas]);
    modal.motivoId.set(9);
    modal.escolherData('2026-11-05');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(sugerirPeriodoSuspensao).toHaveBeenCalledWith(7, '2026-11-05');
    expect(modal.suspensaoInicio()).toBe('2026-11-06');
    expect(modal.suspensaoFim()).toBe('2026-11-10');
    expect(modal.retornoSuspensao()).toBe('2026-11-11');
  });
});
