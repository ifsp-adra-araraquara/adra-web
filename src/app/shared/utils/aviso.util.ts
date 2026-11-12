import { Params } from '@angular/router';
import { AvisoDTO, TipoAviso } from '../models/aviso/Aviso';

export type GrupoAviso = 'hoje' | 'disciplinar' | 'chamada' | 'frequencia' | 'cadastro';

/** Ordem em que os grupos aparecem (o que muda o dia primeiro) e a cor da bolinha de cada um. */
export const GRUPOS_AVISO: { id: GrupoAviso; titulo: string; cor: string }[] = [
  { id: 'hoje', titulo: 'Hoje', cor: 'var(--red-600)' },
  { id: 'disciplinar', titulo: 'Controle disciplinar', cor: 'var(--amber-600)' },
  { id: 'chamada', titulo: 'Chamada', cor: 'var(--blue-600)' },
  { id: 'frequencia', titulo: 'Frequência', cor: 'var(--teal-600)' },
  { id: 'cadastro', titulo: 'Cadastro', cor: 'var(--gray-600)' },
];

const INFO_AVISO: Record<TipoAviso, { grupo: GrupoAviso; acao: string }> = {
  SUSPENSO_HOJE: { grupo: 'hoje', acao: 'Ver ficha' },
  RETORNO_COM_RESPONSAVEL: { grupo: 'hoje', acao: 'Ver ficha' },
  RECOMENDACAO_ADVERTENCIA: { grupo: 'disciplinar', acao: 'Gerar advertência' },
  RECOMENDACAO_SUSPENSAO: { grupo: 'disciplinar', acao: 'Gerar suspensão' },
  PERDE_PROXIMO_PASSEIO: { grupo: 'disciplinar', acao: 'Resolver' },
  DOCUMENTO_A_ASSINAR: { grupo: 'disciplinar', acao: 'Ver registro' },
  CHAMADA_ATRASADA: { grupo: 'chamada', acao: 'Lançar' },
  CHAMADA_DE_HOJE: { grupo: 'chamada', acao: 'Fazer chamada' },
  FALTAS_SEGUIDAS: { grupo: 'frequencia', acao: 'Ver frequência' },
  PRE_CADASTRO_PENDENTE: { grupo: 'cadastro', acao: 'Revisar' },
  CADASTRO_SEM_NASCIMENTO: { grupo: 'cadastro', acao: 'Completar' },
};

export function acaoDoAviso(aviso: AvisoDTO, soChamada = false): string {
  if (soChamada && INFO_AVISO[aviso.tipo].grupo === 'hoje') return 'Abrir chamada';
  return INFO_AVISO[aviso.tipo].acao;
}

/** Avisos agrupados na ordem de GRUPOS_AVISO; grupos vazios ficam de fora. */
export function agruparAvisos(avisos: AvisoDTO[]): { id: GrupoAviso; titulo: string; cor: string; avisos: AvisoDTO[] }[] {
  return GRUPOS_AVISO.map((g) => ({ ...g, avisos: avisos.filter((a) => INFO_AVISO[a.tipo].grupo === g.id) })).filter(
    (g) => g.avisos.length > 0,
  );
}

/**
 * CA-FT18.3: a tela onde o aviso se resolve, já no item.
 * {@code soChamada}: o Educador Social não abre a ficha do atendido — o aviso de hoje leva à chamada.
 */
export function rotaDoAviso(aviso: AvisoDTO, soChamada = false): { comandos: (string | number)[]; queryParams?: Params } {
  switch (INFO_AVISO[aviso.tipo].grupo) {
    case 'hoje':
      if (soChamada) return { comandos: ['/chamada'] };
      return { comandos: ['/assistidos'], queryParams: { assistidoId: aviso.assistidoId, aba: 'disc' } };
    case 'disciplinar':
      return {
        comandos: ['/disciplinar'],
        queryParams: { busca: aviso.titulo, filtro: aviso.tipo.startsWith('RECOMENDACAO') ? 'recomendacoes' : 'pendencias' },
      };
    case 'chamada':
      return { comandos: ['/chamada/grupo', aviso.turmaId!, aviso.data!] };
    case 'frequencia':
      return { comandos: ['/assistidos'], queryParams: { assistidoId: aviso.assistidoId, aba: 'cham' } };
    case 'cadastro':
      return aviso.tipo === 'PRE_CADASTRO_PENDENTE' ? { comandos: ['/pre-cadastros'] } : { comandos: ['/assistidos'] };
  }
}
