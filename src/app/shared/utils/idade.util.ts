/** Idade em anos completos a partir de 'YYYY-MM-DD' (null se vazio/ inválido). */
export function calcularIdade(dataNascimento: string | null | undefined, hoje = new Date()): number | null {
  if (!dataNascimento) return null;
  const [ano, mes, dia] = dataNascimento.split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  let idade = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario = hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);
  if (aindaNaoFezAniversario) idade--;
  return idade >= 0 ? idade : null;
}

/** Data de hoje em 'YYYY-MM-DD' (horário local) — usada no [max] de inputs de data. */
export function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
