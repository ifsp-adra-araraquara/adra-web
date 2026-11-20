/**
 * ADRAbot de ponta a ponta no front, com os 4 perfis: a conversa real
 * (motor + respostas + RoboDados + fila), só a API é simulada. Para cada
 * perfil, as mesmas perguntas do dia a dia: toda pergunta tem resposta com
 * próximo passo, nada sai "undefined", e o front NUNCA chama um endpoint que
 * aquele perfil não pode acessar (a API também barraria com 403).
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { Role } from '../../shared/enum/role.enum';
import { RoboConversa } from './robo-conversa.service';

const ESPERA = () => new Promise((r) => setTimeout(r));

/** Endpoints que cada perfil NÃO pode chamar (espelha AcessoPorPerfilIT da API). */
const PROIBIDOS: Record<Role, RegExp[]> = {
  [Role.COORD]: [],
  [Role.ASSISTENTE]: [/\/api\/chamadas\/status/],
  [Role.EDUCADOR]: [
    /\/api\/robo\/atendidos\/distribuicao/, /\/api\/robo\/atendidos\/movimento/, /\/api\/robo\/social/,
    /\/api\/chamadas\/status/, /\/api\/pre-cadastro/, /\/api\/assistidos\/desligamentos/,
  ],
  [Role.OFICINEIRO]: [
    /\/api\/robo\/atendidos\/distribuicao/, /\/api\/robo\/atendidos\/movimento/, /\/api\/robo\/social/,
    /\/api\/robo\/disciplinar/, /\/api\/chamadas\/status/, /\/api\/turmas/, /\/api\/pre-cadastro/,
    /\/api\/assistidos\/desligamentos/, /\/api\/chamadas\/assistido/, /\/api\/assistidos\/\d+\/disciplinar/,
  ],
};

const PERGUNTAS = [
  'frequencia de outubro',
  'e em setembro?',
  'quem esta faltando seguido',
  'quantos recebem bolsa familia',
  'atendidos por bairro',
  'chamadas pendentes',
  'pre cadastros para avaliar',
  'ocorrencias do mes',
  'aniversariantes do mes',
  'como lanço a chamada',
  'quem ganhou o jogo ontem',
  'frequencia da ana',
  'relatorio para prestacao de contas',
  'quais grupos tem vaga',
];

/** Respostas de exemplo da API (inventadas), pelo caminho. */
function respostaDaApi(url: string): object {
  const caminho = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  if (caminho === '/api/robo/contexto') return { grupos: [{ id: 1, nome: 'Girassol', detalhe: 'Futebol' }], oficinas: [{ id: 10, nome: 'Futebol', detalhe: 'Carlos' }] };
  if (caminho === '/api/robo/frequencia') return { de: '', ate: '', geradoEm: '', linhas: [{ mes: '2026-10', turmaId: 1, nomeTurma: 'Girassol', oficinas: 'Futebol', chamadas: 4, esperados: 40, faltas: 5, justificadas: 1, percentual: 85 }] };
  if (caminho === '/api/robo/frequencia/dia-semana') return { de: '', ate: '', turmaId: null, dias: [{ diaSemana: 1, chamadas: 4, esperados: 40, ausencias: 6, percentual: 85 }] };
  if (caminho === '/api/robo/frequencia/faltas-seguidas') return { limiar: 3, desde: '2026-10-01', total: 0, itens: [] };
  if (caminho === '/api/robo/atendidos/distribuicao') return { por: 'BAIRRO', ativos: 10, itens: [{ rotulo: 'Centro', total: 10 }] };
  if (caminho === '/api/robo/atendidos/movimento') return { ano: 2026, ativosInicio: 8, ativosFim: 10, entradas: 3, saidas: 1, meses: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, entradas: 0, saidas: 0 })), motivos: [] };
  if (caminho === '/api/robo/disciplinar/resumo') return { mes: '2026-11', ocorrencias: 1, advertencias: 0, suspensoes: 0, totalMesAnterior: 2, grupos: [] };
  if (caminho === '/api/robo/disciplinar/um-passo') return [];
  if (caminho === '/api/robo/social/resumo') return { ativos: 10, recebemPrograma: 4, programas: [{ rotulo: 'BPC', total: 1 }], rendaInformada: 8, faixasRenda: [{ rotulo: 'Até R$ 1.000', total: 5 }], pcd: 1, necessidadesEspecificas: 0, problemaSaude: 0, comNis: 6, estudaContraturno: 9, turnoEscola: [] };
  if (caminho === '/api/robo/atendidos/busca') return [{ assistidoId: 7, nome: 'Ana Teste', grupo: 'Girassol', data: null, detalhe: null }];
  if (caminho === '/api/robo/atendidos/aniversariantes') return [];
  if (caminho === '/api/chamadas/status') return [];
  if (caminho === '/api/turmas') return [{ turmaId: 1, nomeTurma: 'Girassol', turno: 'MANHA', faixaEtariaId: null, faixaEtaria: null, capacidade: 20, ativo: true, quantidadeAlunos: 15, oficinaIds: [] }];
  if (caminho === '/api/pre-cadastro') return [];
  if (caminho === '/api/assistidos/desligamentos') return [];
  if (caminho === '/api/avisos') return [];
  if (/^\/api\/chamadas\/assistido\/\d+\/frequencia$/.test(caminho)) return [{ data: '2026-11-03', turmaId: 1, nomeTurma: 'Girassol', statusPresenca: 'PRESENTE' }];
  if (/^\/api\/assistidos\/\d+\/disciplinar$/.test(caminho)) return { resumo: { ocorrenciasAtivas: 0, advertenciasAtivas: 0, suspensoesAtivas: 0 }, registros: [] };
  throw new Error(`Endpoint sem resposta de exemplo: ${caminho}`);
}

describe('ADRAbot — conversa de ponta a ponta com os 4 perfis', () => {
  for (const perfil of [Role.COORD, Role.ASSISTENTE, Role.EDUCADOR, Role.OFICINEIRO]) {
    it(`${perfil}: responde tudo, sem chamar o que o perfil não pode`, async () => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: AuthService, useValue: { currentProfile: signal(perfil), currentUserResponse: signal({ usuarioId: 1, nomeCompleto: 'Ana Teste' }) } },
        ],
      });
      sessionStorage.clear();
      const conversa = TestBed.inject(RoboConversa);
      const http = TestBed.inject(HttpTestingController);
      const chamadas: string[] = [];

      const responderAte = async (tarefa: Promise<unknown>) => {
        let pronto = false;
        void tarefa.finally(() => (pronto = true));
        for (let i = 0; i < 200 && !pronto; i++) {
          await ESPERA();
          for (const req of http.match(() => true) as TestRequest[]) {
            chamadas.push(req.request.urlWithParams);
            req.flush(respostaDaApi(req.request.url));
          }
        }
        await tarefa;
      };

      await responderAte(conversa.abrir());
      expect(conversa.mensagens().length).toBeGreaterThan(0);

      for (const pergunta of PERGUNTAS) {
        const antes = conversa.mensagens().length;
        await responderAte(conversa.enviar(pergunta));
        const ultima = conversa.mensagens()[conversa.mensagens().length - 1];
        expect(conversa.mensagens().length, `${perfil}: "${pergunta}" sem resposta`).toBe(antes + 2);
        expect(ultima.autor).toBe('robo');
        const r = ultima.resposta!;
        expect(r.texto.join(' '), `${perfil}: "${pergunta}"`).not.toMatch(/undefined|NaN|\[object/);
        expect(r.acoes.length + (r.menu?.length ?? 0) + (r.passos?.length ?? 0), `${perfil}: "${pergunta}" sem próximo passo`).toBeGreaterThan(0);
      }

      const indevidas = chamadas.filter((url) => PROIBIDOS[perfil].some((re) => re.test(url)));
      expect(indevidas, `${perfil} chamou endpoint proibido`).toEqual([]);
      http.verify();
    });
  }
});
