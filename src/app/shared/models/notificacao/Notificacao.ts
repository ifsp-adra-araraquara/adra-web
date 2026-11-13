import { TipoAviso } from '../aviso/Aviso';

export type TipoEnvolvido = 'ASSISTIDO' | 'RESPONSAVEL' | 'TURMA' | 'OFICINA' | 'USUARIO';

/** GET /api/notificacoes (FT-14): notificação guardada; `link` é a rota onde ela se resolve. */
export interface NotificacaoDTO {
  notificacaoId: number;
  tipo: TipoAviso;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  criadoEm: string;
  lida: boolean;
  envolvidos: { tipo: TipoEnvolvido; id: number }[];
}

/** GET /api/notificacoes/envio — só Administrador. */
export interface SituacaoEnvioDTO {
  emailLigado: boolean;
  limiteDiario: number;
  enviadosHoje: number;
  pendentes: number;
}

/** POST /api/notificacoes/processar — só Administrador. */
export interface ResultadoProcessamentoDTO {
  geradas: number;
  mensagensEnviadas: number;
}
