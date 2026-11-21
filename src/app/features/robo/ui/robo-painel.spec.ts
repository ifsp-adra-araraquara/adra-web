import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RoboConversa } from '../robo-conversa.service';
import { RoboPainel } from './robo-painel';

describe('RoboPainel — teclado e acessibilidade', () => {
  const enviados: string[] = [];
  const conversa = {
    mensagens: signal([{ id: 1, autor: 'robo', resposta: { texto: ['Oi!'], acoes: [{ tipo: 'menu', rotulo: 'O que eu sei responder' }] } }]),
    pensando: signal(false),
    humor: signal('parado'),
    aberto: signal(true),
    enviar: async (t: string) => void enviados.push(t),
    agir: async () => undefined,
    fechar: () => conversa.aberto.set(false),
    recomecar: async () => undefined,
  };

  beforeEach(() => {
    enviados.length = 0;
    TestBed.configureTestingModule({ imports: [RoboPainel], providers: [{ provide: RoboConversa, useValue: conversa }] });
  });

  function montar() {
    const fixture = TestBed.createComponent(RoboPainel);
    fixture.detectChanges();
    const campo: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const digitar = (texto: string) => {
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
    };
    const tecla = (init: KeyboardEventInit) => campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init }));
    return { fixture, campo, digitar, tecla };
  }

  it('Enter envia a pergunta e limpa o campo', () => {
    const { campo, digitar, tecla } = montar();
    digitar('frequencia de outubro');
    tecla({});
    expect(enviados).toEqual(['frequencia de outubro']);
    expect(campo.value).toBe('');
  });

  it('Shift+Enter não envia (quebra a linha) e composição de acento também não', () => {
    const { digitar, tecla } = montar();
    digitar('linha um');
    tecla({ shiftKey: true });
    tecla({ isComposing: true });
    expect(enviados).toEqual([]);
  });

  it('Esc fecha; janela é um diálogo rotulado e a conversa é um log', () => {
    const { fixture } = montar();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby')).toBe('robo-titulo');
    expect(el.querySelector('[role="log"]')).toBeTruthy();
    el.querySelector('section')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(conversa.aberto()).toBe(false);
  });
});
