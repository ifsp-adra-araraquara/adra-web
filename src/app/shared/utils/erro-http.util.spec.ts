import { HttpErrorResponse } from '@angular/common/http';
import { errosPorCampo, mensagemErro } from './erro-http.util';

describe('erro-http.util', () => {
  it('separa os detalhes de validacao por campo', () => {
    const resposta = new HttpErrorResponse({
      status: 400,
      error: { mensagem: 'Um ou mais campos estao invalidos', detalhes: ['cpf: CPF invalido', 'telefone: DDD + numero'] },
    });

    expect(errosPorCampo(resposta)).toEqual({ cpf: 'CPF invalido', telefone: 'DDD + numero' });
    expect(mensagemErro(resposta, 'padrao')).toBe('CPF invalido. DDD + numero');
  });

  it('usa a mensagem do back ou o texto padrao', () => {
    expect(mensagemErro(new HttpErrorResponse({ status: 409, error: { mensagem: 'CPF ja cadastrado' } }), 'padrao')).toBe('CPF ja cadastrado');
    expect(mensagemErro(new HttpErrorResponse({ status: 0 }), 'padrao')).toBe('padrao');
  });
});
