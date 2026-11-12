import { AtendidoListaEventoDTO } from '../../../shared/models/lista/ListaEvento';
import { montarBlocos } from './lista-evento.util';

// Dados inventados.
const atendido = (assistidoId: number, nomeCompleto: string, nomeTurma: string): AtendidoListaEventoDTO => ({
  assistidoId,
  nomeCompleto,
  dataNascimento: '2012-05-10',
  turmaId: nomeTurma.length,
  nomeTurma,
  responsavelNome: null,
  responsavelTelefone: null,
});

const lista = [
  atendido(1, 'Zélia Souza', 'Conexão Jovem B'),
  atendido(2, 'Ângela Lima', 'Conexão Jovem A'),
  atendido(3, 'bruno Alves', 'Conexão Jovem B'),
];

describe('lista-evento.util', () => {
  it('ordem alfabética ignora acento e caixa, com numeração de 1 a N', () => {
    const [bloco] = montarBlocos(lista, 'alfabetica');
    expect(bloco.titulo).toBeNull();
    expect(bloco.linhas.map((l) => `${l.numero} ${l.nomeCompleto}`)).toEqual([
      '1 Ângela Lima',
      '2 bruno Alves',
      '3 Zélia Souza',
    ]);
  });

  it('ordem por grupo: um bloco por grupo e numeração contínua', () => {
    const blocos = montarBlocos(lista, 'grupo');
    expect(blocos.map((b) => b.titulo)).toEqual(['Conexão Jovem A', 'Conexão Jovem B']);
    expect(blocos[1].linhas.map((l) => `${l.numero} ${l.nomeCompleto}`)).toEqual(['2 bruno Alves', '3 Zélia Souza']);
  });
});
