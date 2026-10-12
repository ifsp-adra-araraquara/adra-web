export function cliqueEmElementoInterativo(evento: MouseEvent): boolean {
  return !!(evento.target as Element).closest('a, button, [role="menu"]');
}
