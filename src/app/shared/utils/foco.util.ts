const SELETOR_FOCAVEL = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Elementos que recebem foco pelo Tab dentro do container, na ordem do documento. */
export function elementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter((el) => !el.closest('[hidden]'));
}

/** Diálogo modal: Tab e Shift+Tab giram dentro do container, sem escapar para a página atrás. */
export function prenderTab(evento: KeyboardEvent, container: HTMLElement): void {
  if (evento.key !== 'Tab' || evento.defaultPrevented) return;
  const itens = elementosFocaveis(container);
  if (itens.length === 0) {
    evento.preventDefault();
    container.focus();
    return;
  }
  const primeiro = itens[0];
  const ultimo = itens[itens.length - 1];
  const ativo = container.ownerDocument.activeElement;
  if (evento.shiftKey && (ativo === primeiro || ativo === container)) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && ativo === ultimo) {
    evento.preventDefault();
    primeiro.focus();
  }
}

/**
 * Foco ao abrir: o campo com [autofocus] ou o próprio diálogo (o leitor de tela
 * anuncia o título e o teclado do celular não abre sozinho). Se algo dentro já
 * pegou o foco (ex.: a busca do registro rápido), respeita.
 */
export function focarAoAbrir(container: HTMLElement): void {
  if (container.contains(container.ownerDocument.activeElement)) return;
  (container.querySelector<HTMLElement>('[autofocus]') ?? container).focus();
}
