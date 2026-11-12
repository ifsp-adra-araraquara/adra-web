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

const MOEDA_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 1500 -> "R$ 1.500,00" (independe do LOCALE_ID da aplicação). */
export function formatarMoeda(valor: number | null | undefined): string {
  return valor == null ? '' : MOEDA_BRL.format(valor);
}

/** CPF parcial para listas (LGPD): só os dígitos do meio aparecem. Sem CPF completo, "—". */
export function cpfParcial(cpf: string | null | undefined): string {
  const d = (cpf ?? '').replace(/\D/g, '');
  return d.length === 11 ? `***.***.${d.slice(6, 9)}-**` : '—';
}

/** Link de discagem (tel:) a partir de um telefone em qualquer formato. */
export function linkTelefone(telefone: string | null | undefined): string {
  return 'tel:+55' + telefoneNacional(telefone ?? '');
}
