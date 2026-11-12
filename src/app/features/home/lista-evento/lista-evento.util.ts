import { AtendidoListaEventoDTO } from '../../../shared/models/lista/ListaEvento';

export type OrdemLista = 'alfabetica' | 'grupo';

/** Bloco da folha: na ordem por grupo, um bloco por grupo; na alfabética, um só (sem título). */
export interface BlocoLista {
  titulo: string | null;
  linhas: (AtendidoListaEventoDTO & { numero: number })[];
}

const alfabetica = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/** Numeração contínua de 1 a N, em ordem alfabética ou agrupada por grupo (grupos também em ordem alfabética). */
export function montarBlocos(atendidos: AtendidoListaEventoDTO[], ordem: OrdemLista): BlocoLista[] {
  const porNome = [...atendidos].sort((a, b) => alfabetica.compare(a.nomeCompleto, b.nomeCompleto));
  let numero = 0;
  const numerar = (lista: AtendidoListaEventoDTO[]) => lista.map((a) => ({ ...a, numero: ++numero }));
  if (ordem === 'alfabetica') {
    return [{ titulo: null, linhas: numerar(porNome) }];
  }
  const grupos = [...new Set(porNome.map((a) => a.nomeTurma))].sort((a, b) => alfabetica.compare(a, b));
  return grupos.map((grupo) => ({
    titulo: grupo,
    linhas: numerar(porNome.filter((a) => a.nomeTurma === grupo)),
  }));
}
