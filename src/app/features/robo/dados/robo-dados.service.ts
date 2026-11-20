import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AvisoDTO } from '../../../shared/models/aviso/Aviso';
import { StatusChamadaDiaDTO } from '../../../shared/models/chamada/ChamadaGrupo';
import { SolicitacaoDesligamentoDTO } from '../../../shared/models/desligamento/SolicitacaoDesligamento';
import { FichaDisciplinarDTO } from '../../../shared/models/disciplinar/Disciplinar';
import { PreCadastroResumoDTO } from '../../../shared/models/precadastro/PreCadastro';
import { FrequenciaDiaDTO } from '../../../shared/models/presenca/FrequenciaDiaDTO';
import { TurmaResponseDTO } from '../../../shared/models/turma/TurmaResponseDTO';
import { Dimensao, Entidades, Opcao } from '../motor/tipos';

/* ---- Espelhos dos DTOs de /api/robo (adra-api: domain/dto/robo) ---- */

export interface ContagemDTO {
  rotulo: string;
  total: number;
}

export interface FrequenciaLinha {
  mes: string;
  turmaId: number;
  nomeTurma: string;
  oficinas: string | null;
  chamadas: number;
  esperados: number;
  faltas: number;
  justificadas: number;
  percentual: number | null;
}

export interface FrequenciaRoboDTO {
  de: string;
  ate: string;
  geradoEm: string;
  linhas: FrequenciaLinha[];
}

export interface FrequenciaDiaSemanaDTO {
  de: string;
  ate: string;
  turmaId: number | null;
  dias: { diaSemana: number; chamadas: number; esperados: number; ausencias: number; percentual: number | null }[];
}

export interface FaltasSeguidasRoboDTO {
  limiar: number;
  desde: string;
  itens: { assistidoId: number; nome: string; turmaId: number | null; turma: string | null; faltas: number; ultimaChamada: string }[];
  total: number;
}

export interface DistribuicaoAtendidosDTO {
  por: Dimensao;
  ativos: number;
  itens: ContagemDTO[];
}

export interface MovimentoAtendidosDTO {
  ano: number;
  ativosInicio: number;
  ativosFim: number;
  entradas: number;
  saidas: number;
  meses: { mes: number; entradas: number; saidas: number }[];
  motivos: ContagemDTO[];
}

export interface DisciplinarResumoRoboDTO {
  mes: string;
  ocorrencias: number;
  advertencias: number;
  suspensoes: number;
  totalMesAnterior: number;
  grupos: { turmaId: number | null; nomeTurma: string; ocorrencias: number; advertencias: number; suspensoes: number; totalMesAnterior: number }[];
}

export interface SocialResumoDTO {
  ativos: number;
  recebemPrograma: number;
  programas: ContagemDTO[];
  rendaInformada: number;
  faixasRenda: ContagemDTO[];
  pcd: number;
  necessidadesEspecificas: number;
  problemaSaude: number;
  comNis: number;
  estudaContraturno: number;
  turnoEscola: ContagemDTO[];
}

export interface AtendidoRoboDTO {
  assistidoId: number;
  nome: string;
  grupo: string | null;
  data: string | null;
  detalhe: string | null;
}

interface RoboContextoDTO {
  grupos: Opcao[];
  oficinas: Opcao[];
}

/** Quanto tempo uma resposta da API vale no robô (o back ainda guarda 2 min). */
export const VALIDADE_CACHE_MS = 60_000;
/** Teto de respostas guardadas: as mais antigas saem primeiro. */
const MAXIMO_NO_CACHE = 60;

interface Guardado {
  expira: number;
  pedido: Promise<unknown>;
}

/**
 * ADRAbot — todas as leituras que o robô faz. Só GET; nada é gravado.
 *
 * Cache em memória por {@link VALIDADE_CACHE_MS}: "Comparar", "Gerar PDF" e
 * "e em setembro?" reaproveitam o que já veio, e dois pedidos iguais ao mesmo
 * tempo viram um só. Erro não fica guardado. O contexto (grupos e oficinas
 * visíveis) vale a sessão inteira. Tudo é limpo ao trocar de usuário.
 */
@Injectable({ providedIn: 'root' })
export class RoboDados {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  private readonly cache = new Map<string, Guardado>();
  private entidadesPedido: Promise<Entidades> | null = null;

  private get<T>(caminho: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const limpos: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) limpos[k] = v;
    const chave = `${caminho}?${new URLSearchParams(Object.entries(limpos).map(([k, v]) => [k, String(v)])).toString()}`;
    const agora = Date.now();
    const guardado = this.cache.get(chave);
    if (guardado && guardado.expira > agora) return guardado.pedido as Promise<T>;

    const pedido = firstValueFrom(this.http.get<T>(`${this.api}${caminho}`, { params: limpos }));
    pedido.catch(() => this.cache.delete(chave));
    this.cache.delete(chave);
    this.cache.set(chave, { expira: agora + VALIDADE_CACHE_MS, pedido });
    if (this.cache.size > MAXIMO_NO_CACHE) this.cache.delete(this.cache.keys().next().value!);
    return pedido;
  }

  entidades(): Promise<Entidades> {
    this.entidadesPedido ??= firstValueFrom(this.http.get<RoboContextoDTO>(`${this.api}/api/robo/contexto`)).catch((erro) => {
      this.entidadesPedido = null;
      throw erro;
    });
    return this.entidadesPedido;
  }

  /** Esquece tudo (troca de usuário ou "Recomeçar"). */
  limpar(): void {
    this.entidadesPedido = null;
    this.cache.clear();
  }

  frequencia(de: string, ate: string): Promise<FrequenciaRoboDTO> {
    return this.get('/api/robo/frequencia', { de, ate });
  }

  frequenciaPorDiaDaSemana(de: string, ate: string, turmaId?: number): Promise<FrequenciaDiaSemanaDTO> {
    return this.get('/api/robo/frequencia/dia-semana', { de, ate, turmaId });
  }

  faltasSeguidas(minimo?: number): Promise<FaltasSeguidasRoboDTO> {
    return this.get('/api/robo/frequencia/faltas-seguidas', { minimo });
  }

  distribuicao(por: Dimensao): Promise<DistribuicaoAtendidosDTO> {
    return this.get('/api/robo/atendidos/distribuicao', { por });
  }

  movimento(ano: number): Promise<MovimentoAtendidosDTO> {
    return this.get('/api/robo/atendidos/movimento', { ano });
  }

  disciplinar(mes: string): Promise<DisciplinarResumoRoboDTO> {
    return this.get('/api/robo/disciplinar/resumo', { mes });
  }

  social(): Promise<SocialResumoDTO> {
    return this.get('/api/robo/social/resumo');
  }

  buscarAtendidos(nome: string): Promise<AtendidoRoboDTO[]> {
    return this.get('/api/robo/atendidos/busca', { nome });
  }

  aniversariantes(mes: number): Promise<AtendidoRoboDTO[]> {
    return this.get('/api/robo/atendidos/aniversariantes', { mes });
  }

  umPasso(): Promise<AtendidoRoboDTO[]> {
    return this.get('/api/robo/disciplinar/um-passo');
  }

  /* ---- Endpoints que já existiam (mesmas permissões das telas) ---- */

  avisos(): Promise<AvisoDTO[]> {
    return this.get('/api/avisos');
  }

  statusChamadas(inicio: string, fim: string): Promise<StatusChamadaDiaDTO[]> {
    return this.get('/api/chamadas/status', { inicio, fim });
  }

  grupos(): Promise<TurmaResponseDTO[]> {
    return this.get('/api/turmas', { ativo: 'true' });
  }

  preCadastros(status: 'PENDENTE' | 'LISTA_ESPERA'): Promise<PreCadastroResumoDTO[]> {
    return this.get('/api/pre-cadastro', { status });
  }

  desligamentos(): Promise<SolicitacaoDesligamentoDTO[]> {
    return this.get('/api/assistidos/desligamentos');
  }

  frequenciaDoAtendido(assistidoId: number): Promise<FrequenciaDiaDTO[]> {
    return this.get(`/api/chamadas/assistido/${assistidoId}/frequencia`);
  }

  fichaDisciplinar(assistidoId: number): Promise<FichaDisciplinarDTO> {
    return this.get(`/api/assistidos/${assistidoId}/disciplinar`);
  }
}
