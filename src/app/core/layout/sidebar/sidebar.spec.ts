import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../auth.service';
import { Role } from '../../../shared/enum/role.enum';
import { ModuloDTO } from '../../../shared/models/modulo/ModuloDTO';
import { Sidebar } from './sidebar';

const modulo = (codigo: string, nomeExibicao = codigo): ModuloDTO => ({
  codigo,
  nomeExibicao,
  rota: '/' + codigo.toLowerCase(),
  icone: null,
  padrao: false,
});

/** Seções do menu e os itens de cada uma, no formato "Seção: Item, Item". */
function menu(perfil: Role, modulos: ModuloDTO[]): string[] {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: { currentProfile: signal(perfil), modulos: signal(modulos), currentUser: signal(null), currentModule: signal(null) },
      },
    ],
  });
  const sidebar = TestBed.runInInjectionContext(() => new Sidebar());
  return sidebar.navAgrupado().map((g) => `${g.secao}: ${g.itens.map((i) => i.nomeExibicao).join(', ')}`);
}

describe('Sidebar — seções do menu', () => {
  it('Coordenador começa pelo Painel e separa Principal, Gestão e Pedagógico', () => {
    expect(
      menu(Role.COORD, [
        modulo('PAINEL', 'Painel'),
        modulo('DASHBOARD', 'Dashboard'),
        modulo('ASSISTIDOS', 'Assistidos'),
        modulo('OFICINAS', 'Oficinas'),
        modulo('SEMANARIOS', 'Semanários'),
        modulo('CHAMADA', 'Chamada'),
        modulo('DISCIPLINAR', 'Disciplinar'),
      ]),
    ).toEqual([
      'Principal: Painel, Calendário',
      'Gestão: Atendidos, Oficinas, Semanários',
      'Pedagógico: Chamada, Disciplinar',
    ]);
  });

  it('Educador Social: Calendário em Principal; Chamada e Disciplinar em Pedagógico', () => {
    expect(
      menu(Role.EDUCADOR, [modulo('CHAMADA', 'Chamada'), modulo('DASHBOARD', 'Dashboard'), modulo('DISCIPLINAR', 'Disciplinar')]),
    ).toEqual(['Principal: Calendário', 'Pedagógico: Chamada, Disciplinar']);
  });

  it('Oficineiro segue as mesmas seções, começando pelo Calendário', () => {
    expect(menu(Role.OFICINEIRO, [])).toEqual(['Principal: Calendário', 'Gestão: Grupos', 'Pedagógico: Semanário']);
  });
});
