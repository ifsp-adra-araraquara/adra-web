import { DIAS_SEMANA, DiaSemana } from '../enum/DiaSemana';

export function juntarComE(itens: string[]): string {
  return itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : (itens[0] ?? '');
}

export function ordenarDias(dias: DiaSemana[]): DiaSemana[] {
  return DIAS_SEMANA.map((d) => d.valor).filter((dia) => dias.includes(dia));
}

export function nomesDosDias(dias: DiaSemana[]): string {
  return juntarComE(DIAS_SEMANA.filter((d) => dias.includes(d.valor)).map((d) => d.rotulo));
}
