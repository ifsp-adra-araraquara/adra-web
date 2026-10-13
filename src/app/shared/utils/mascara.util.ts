const DDI_BRASIL = '55';

export function telefoneNacional(valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  return digitos.length > 11 && digitos.startsWith(DDI_BRASIL) ? digitos.slice(DDI_BRASIL.length) : digitos;
}

export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length > 11 && digitos.startsWith(DDI_BRASIL)) {
    return `+${DDI_BRASIL} ${formatarTelefoneNacional(digitos.slice(DDI_BRASIL.length, 13))}`;
  }
  return formatarTelefoneNacional(digitos.slice(0, 11));
}

function formatarTelefoneNacional(digitos: string): string {
  if (digitos.length <= 10) {
    return digitos
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digitos
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}
