import { cpfParcial, formatarTelefone, linkTelefone, telefoneNacional } from './mascara.util';

describe('mascara.util', () => {
  it('aceita telefone com +55 e guarda so DDD + numero', () => {
    expect(formatarTelefone('+55 16 98888-7777')).toBe('+55 (16) 98888-7777');
    expect(telefoneNacional('+55 16 98888-7777')).toBe('16988887777');
    expect(telefoneNacional('(55) 98888-7777')).toBe('55988887777');
  });

  it('CPF parcial para listas mostra só os dígitos do meio', () => {
    expect(cpfParcial('98765432100')).toBe('***.***.321-**');
    expect(cpfParcial('987.654.321-00')).toBe('***.***.321-**');
    expect(cpfParcial(null)).toBe('—');
    expect(cpfParcial('123')).toBe('—');
  });

  it('link de telefone usa o número nacional com +55', () => {
    expect(linkTelefone('(16) 99999-0000')).toBe('tel:+5516999990000');
    expect(linkTelefone('+55 16 99999-0000')).toBe('tel:+5516999990000');
  });
});
