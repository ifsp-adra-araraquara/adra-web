import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { NotificacaoDTO } from '../shared/models/notificacao/Notificacao';
import { NotificacaoService } from './notificacao.service';

const API = `${environment.apiUrl}/api/notificacoes`;

function notificacao(id: number, lida: boolean): NotificacaoDTO {
  return {
    notificacaoId: id,
    tipo: 'SEMANARIO_PENDENTE',
    titulo: `Aviso ${id}`,
    mensagem: null,
    link: null,
    criadoEm: '2026-11-12T07:00:00-03:00',
    lida,
    envolvidos: [],
  };
}

describe('NotificacaoService', () => {
  let service: NotificacaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificacaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('o sino mostra só as não lidas, no máximo 5', async () => {
    const carregando = service.carregarNovas();
    const lista = [notificacao(1, true), ...[2, 3, 4, 5, 6, 7].map((id) => notificacao(id, false))];
    http.expectOne((r) => r.url === API).flush({ conteudo: lista, pagina: 0, tamanho: 20, totalElementos: 7, totalPaginas: 1 });
    await carregando;

    expect(service.novas().map((n) => n.notificacaoId)).toEqual([2, 3, 4, 5, 6]);
  });

  it('marcar como lida tira do sino e baixa o contador', async () => {
    service.naoLidas.set(2);
    service.novas.set([notificacao(1, false), notificacao(2, false)]);

    const marcando = service.marcarComoLida(notificacao(1, false));
    const req = http.expectOne(`${API}/1/lida`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
    await marcando;

    expect(service.novas().map((n) => n.notificacaoId)).toEqual([2]);
    expect(service.naoLidas()).toBe(1);
  });

  it('notificação já lida não vai ao servidor', async () => {
    await service.marcarComoLida(notificacao(1, true));
    http.expectNone(`${API}/1/lida`);
  });
});
