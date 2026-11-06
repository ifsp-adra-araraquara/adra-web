import { elementosFocaveis, focarAoAbrir, prenderTab } from './foco.util';

function montarDialogo(): HTMLElement {
  const dialogo = document.createElement('div');
  dialogo.tabIndex = -1;
  dialogo.innerHTML = `
    <button id="primeiro">Fechar</button>
    <input id="campo" />
    <button id="desabilitado" disabled>Nada</button>
    <div hidden><button id="escondido">Escondido</button></div>
    <button id="ultimo">Salvar</button>`;
  document.body.appendChild(dialogo);
  return dialogo;
}

function tab(shiftKey = false): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });
}

describe('foco.util', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('ignora desabilitados e escondidos', () => {
    const ids = elementosFocaveis(montarDialogo()).map((el) => el.id);
    expect(ids).toEqual(['primeiro', 'campo', 'ultimo']);
  });

  it('Tab no último volta ao primeiro, e Shift+Tab no primeiro vai ao último', () => {
    const dialogo = montarDialogo();
    dialogo.querySelector<HTMLElement>('#ultimo')!.focus();
    const ida = tab();
    prenderTab(ida, dialogo);
    expect(ida.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('primeiro');

    const volta = tab(true);
    prenderTab(volta, dialogo);
    expect(document.activeElement?.id).toBe('ultimo');
  });

  it('Tab no meio segue o fluxo normal', () => {
    const dialogo = montarDialogo();
    dialogo.querySelector<HTMLElement>('#primeiro')!.focus();
    const evento = tab();
    prenderTab(evento, dialogo);
    expect(evento.defaultPrevented).toBe(false);
  });

  it('ao abrir foca o diálogo, a não ser que algo dentro já tenha o foco', () => {
    const dialogo = montarDialogo();
    focarAoAbrir(dialogo);
    expect(document.activeElement).toBe(dialogo);

    dialogo.querySelector<HTMLElement>('#campo')!.focus();
    focarAoAbrir(dialogo);
    expect(document.activeElement?.id).toBe('campo');
  });
});
