/** "2026-11-04" -> Date local (sem fuso: new Date("2026-11-04") seria UTC e poderia virar o dia anterior). */
function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function paraIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function somarDias(iso: string, dias: number): string {
  const data = paraData(iso);
  data.setDate(data.getDate() + dias);
  return paraIso(data);
}

function diaMes(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

/** Segunda-feira da semana do dia informado (igual ao back). */
export function segundaDaSemana(iso: string): string {
  const diaDaSemana = paraData(iso).getDay(); // 0 = domingo
  const voltar = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
  return somarDias(iso, -voltar);
}

/** "2026-11-02" -> "02/11 a 08/11" */
export function rotuloSemana(segunda: string): string {
  return `${diaMes(segunda)} a ${diaMes(somarDias(segunda, 6))}`;
}

/** Segundas-feiras de `antes` semanas atrás até `depois` semanas à frente, a mais recente primeiro. */
export function semanasAoRedor(hoje: string, antes: number, depois: number): string[] {
  const atual = segundaDaSemana(hoje);
  const semanas: string[] = [];
  for (let i = depois; i >= -antes; i--) {
    semanas.push(somarDias(atual, i * 7));
  }
  return semanas;
}
