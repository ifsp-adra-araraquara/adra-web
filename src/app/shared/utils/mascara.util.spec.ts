import { formatarTelefone, telefoneNacional } from './mascara.util';

describe('mascara.util', () => {
  it('aceita telefone com +55 e guarda so DDD + numero', () => {
    expect(formatarTelefone('+55 16 98888-7777')).toBe('+55 (16) 98888-7777');
    expect(telefoneNacional('+55 16 98888-7777')).toBe('16988887777');
    expect(telefoneNacional('(55) 98888-7777')).toBe('55988887777');
  });
});
