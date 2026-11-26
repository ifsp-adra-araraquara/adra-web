import { cpfParcial, formatarTelefone, formatarValorMoeda, linkTelefone, parseMoeda, telefoneNacional } from './mascara.util';

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

  it('interpreta valores monetários em pt-BR e decimal com ponto sem multiplicar por 100', () => {
    expect(parseMoeda('1500,00')).toBe(1500);
    expect(parseMoeda('1.500,00')).toBe(1500);
    expect(parseMoeda('1.500,50')).toBe(1500.5);
    expect(parseMoeda('1500,5')).toBe(1500.5);
    expect(parseMoeda('1.500')).toBe(1500);
    expect(parseMoeda('1.500.000')).toBe(1500000);
    expect(parseMoeda('1500')).toBe(1500);
    expect(parseMoeda('1500.50')).toBe(1500.5);
    expect(parseMoeda('1,500.50')).toBe(1500.5);
    expect(parseMoeda('R$ 2.350,75')).toBe(2350.75);
    expect(parseMoeda('0')).toBe(0);
    expect(parseMoeda('0,00')).toBe(0);
    expect(parseMoeda('1500,')).toBe(1500);
    expect(parseMoeda('')).toBeNull();
    expect(parseMoeda('abc')).toBeNull();
  });

  it('formata número para exibição em campo monetário', () => {
    expect(formatarValorMoeda(1500)).toBe('1.500,00');
    expect(formatarValorMoeda(1500.5)).toBe('1.500,50');
    expect(formatarValorMoeda(0)).toBe('0,00');
    expect(formatarValorMoeda(null)).toBe('');
  });
});
