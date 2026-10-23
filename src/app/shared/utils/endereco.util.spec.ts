import { enderecoParaPayload, formatarEndereco } from './endereco.util';

describe('endereco.util', () => {
  it('endereço sem nada preenchido vira null no payload', () => {
    expect(enderecoParaPayload({ logradouro: '  ', numero: '', bairro: '', pontoReferencia: '' })).toBeNull();
  });

  it('tira espaços e mantém só o que foi preenchido', () => {
    expect(enderecoParaPayload({ logradouro: ' Rua A ', numero: '10', bairro: '', pontoReferencia: '' })).toEqual({
      logradouro: 'Rua A',
      numero: '10',
      bairro: null,
      pontoReferencia: null,
    });
  });

  it('formata rua, número e bairro', () => {
    expect(formatarEndereco({ logradouro: 'Rua A', numero: '10', bairro: 'Centro' })).toBe('Rua A, 10 — Centro');
    expect(formatarEndereco(null)).toBe('');
  });
});
