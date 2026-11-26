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
const NUMERO_BRL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1500 -> "R$ 1.500,00" (independe do LOCALE_ID da aplicação). */
export function formatarMoeda(valor: number | null | undefined): string {
  return valor == null ? '' : MOEDA_BRL.format(valor);
}

/** 1500 -> "1.500,00" (para exibição em campos de entrada monetários). */
export function formatarValorMoeda(valor: number | null | undefined): string {
  return valor == null || !Number.isFinite(valor) ? '' : NUMERO_BRL.format(valor);
}

/**
 * Converte texto digitado em campo monetário (pt-BR ou decimal com ponto) para número.
 * Ex.: "1.500,00" -> 1500; "1500,50" -> 1500.5; "1.500" -> 1500; "1500.50" -> 1500.5; "" -> null.
 */
export function parseMoeda(valor: string | null | undefined): number | null {
  const limpo = (valor ?? '').replace(/[^\d.,]/g, '');
  if (!limpo || !/\d/.test(limpo)) return null;

  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');

  let normalizado: string;
  if (ultimaVirgula !== -1 && ultimoPonto !== -1) {
    // Ambos presentes: o último separador é o decimal ("1.500,50" ou "1,500.50").
    const decimal = ultimaVirgula > ultimoPonto ? ultimaVirgula : ultimoPonto;
    const inteiro = limpo.slice(0, decimal).replace(/[.,]/g, '');
    const fracao = limpo.slice(decimal + 1).replace(/[.,]/g, '');
    normalizado = fracao ? `${inteiro || '0'}.${fracao}` : inteiro || '0';
  } else if (ultimaVirgula !== -1) {
    // Só vírgula: em pt-BR é sempre separador decimal ("1500,00", "1500,50").
    const inteiro = limpo.slice(0, ultimaVirgula).replace(/,/g, '');
    const fracao = limpo.slice(ultimaVirgula + 1).replace(/,/g, '');
    normalizado = fracao ? `${inteiro || '0'}.${fracao}` : inteiro || '0';
  } else if (ultimoPonto !== -1) {
    // Só ponto: vários pontos ("1.500.000") ou exatamente 3 dígitos após o ponto ("1.500") = milhar;
    // caso contrário ("1500.50", "1500.5") = decimal.
    const partes = limpo.split('.');
    const ehMilhar = partes.length > 2 || (partes.length === 2 && partes[0].length > 0 && partes[1].length === 3);
    if (ehMilhar) {
      normalizado = limpo.replace(/\./g, '');
    } else {
      const inteiro = partes[0] || '0';
      const fracao = partes[1] ?? '';
      normalizado = fracao ? `${inteiro}.${fracao}` : inteiro;
    }
  } else {
    normalizado = limpo;
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100) / 100;
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
