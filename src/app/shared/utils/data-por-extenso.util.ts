import { INSTITUICAO } from './instituicao';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** yyyy-MM-dd → "Araraquara, 9 de setembro de 2026." (cabeçalho dos documentos impressos). */
export function dataPorExtenso(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${INSTITUICAO.cidade}, ${d} de ${MESES[m - 1]} de ${a}.`;
}
