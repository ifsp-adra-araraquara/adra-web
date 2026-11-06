import { nomeCurto } from './nome.util';

describe('nomeCurto', () => {
  it('primeiro nome + inicial do último', () => {
    expect(nomeCurto('Lucas Martins')).toBe('Lucas M.');
    expect(nomeCurto('Pedro Henrique da Silva Souza')).toBe('Pedro S.');
  });

  it('nome composto curto fica inteiro; longo, só o primeiro', () => {
    expect(nomeCurto('Ana Clara Ribeiro')).toBe('Ana Clara R.');
    expect(nomeCurto('Maximiliano Augusto Pereira')).toBe('Maximiliano P.');
  });

  it('um nome só fica como está', () => {
    expect(nomeCurto('Lucas')).toBe('Lucas');
  });
});
