import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { environment } from '../../../../environments/environment';
import { NotificacaoDTO } from '../../../shared/models/notificacao/Notificacao';
import { Notificacoes } from './notificacoes';

const API = `${environment.apiUrl}/api/notificacoes`;

function notificacao(id: number, lida: boolean): NotificacaoDTO {
  return {
    notificacaoId: id,
    tipo: 'FALTAS_SEGUIDAS',
    titulo: `Atendido ${id} chegou a 3 faltas seguidas`,
    mensagem: 'SI Manhã · última chamada em 10/11.',
    link: `/assistidos?assistidoId=${id}&aba=cham`,
    criadoEm: '2026-11-12T07:00:00-03:00',
    lida,
    envolvidos: [{ tipo: 'ASSISTIDO', id }],
  };
}

describe('Notificacoes', () => {
  let fixture: ComponentFixture<Notificacoes>;
  let http: HttpTestingController;

  async function montar(administrador: boolean): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Notificacoes],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { ehAdministrador: signal(administrador) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Notificacoes);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  async function responderLista(conteudo: NotificacaoDTO[]): Promise<void> {
    http
      .expectOne((r) => r.url === API && r.params.get('pagina') === '0')
      .flush({ conteudo, pagina: 0, tamanho: 20, totalElementos: conteudo.length, totalPaginas: 1 });
    await Promise.resolve();
    http.expectOne(`${API}/nao-lidas`).flush({ total: conteudo.filter((n) => !n.lida).length });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('lista as notificações e destaca as não lidas', async () => {
    await montar(false);
    await responderLista([notificacao(1, false), notificacao(2, true)]);

    const itens: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.item'));
    expect(itens.length).toBe(2);
    expect(itens[0].classList).toContain('nao-lida');
    expect(itens[1].classList).not.toContain('nao-lida');
    expect(fixture.nativeElement.textContent).toContain('Marcar todas como lidas');
    expect(fixture.nativeElement.textContent).not.toContain('Resumo diário por e-mail');
  });

  it('mostra a situação do envio por e-mail só para o Administrador', async () => {
    await montar(true);
    http.expectOne(`${API}/envio`).flush({ emailLigado: false, limiteDiario: 250, enviadosHoje: 0, pendentes: 3 });
    await responderLista([]);

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Resumo diário por e-mail');
    expect(texto).toContain('Desligado');
    expect(texto).toContain('Nenhuma notificação por aqui.');
  });
});
