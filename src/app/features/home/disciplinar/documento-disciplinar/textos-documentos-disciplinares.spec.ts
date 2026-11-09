import { NivelDisciplinar } from '../../../../shared/enum/NivelDisciplinar';
import { Sexo } from '../../../../shared/enum/Sexo';
import { RegistroDisciplinarDTO } from '../../../../shared/models/disciplinar/Disciplinar';
import {
  diaDaSemana,
  diasUteis,
  modeloDocumento,
  numeroPorExtenso,
  pronomeAtendido,
  proximoDiaUtil,
  textoDocumento,
} from './textos-documentos-disciplinares';

const base = {
  nomeAssistido: 'Lucas Martins',
  sexoAssistido: Sexo.MASCULINO,
  motivo: 'Agressão a colega',
  descricao: 'Empurrou um colega no intervalo.',
  sequencia: 1,
  dataRegistro: '2026-09-09',
  suspensaoInicio: null,
  suspensaoFim: null,
} as Partial<RegistroDisciplinarDTO>;

function registro(extra: Partial<RegistroDisciplinarDTO>): RegistroDisciplinarDTO {
  return { ...base, ...extra } as RegistroDisciplinarDTO;
}

describe('textos dos documentos disciplinares (FT-25)', () => {
  it('escolhe o modelo pelo nível e pela origem', () => {
    expect(modeloDocumento({ nivel: NivelDisciplinar.ADVERTENCIA, origem: 'MANUAL' })).toBe('ADVERTENCIA_FATO');
    expect(modeloDocumento({ nivel: NivelDisciplinar.ADVERTENCIA, origem: 'RECOMENDACAO' })).toBe('ADVERTENCIA_ACUMULO');
    expect(modeloDocumento({ nivel: NivelDisciplinar.SUSPENSAO, origem: 'MANUAL' })).toBe('SUSPENSAO');
    expect(modeloDocumento({ nivel: NivelDisciplinar.UNIFORME, origem: 'MANUAL' })).toBe('UNIFORME');
    expect(modeloDocumento({ nivel: NivelDisciplinar.OCORRENCIA, origem: 'MANUAL' })).toBe('OCORRENCIA');
  });

  it('conta dias úteis e pula o fim de semana no retorno (exemplo do modelo da ADRA)', () => {
    expect(diasUteis('2026-09-09', '2026-09-11')).toBe(3);
    expect(proximoDiaUtil('2026-09-11')).toBe('2026-09-14');
    expect(diaDaSemana('2026-09-14')).toBe('segunda-feira');
    expect(diasUteis('2026-09-11', '2026-09-14')).toBe(2);
    expect(numeroPorExtenso(3)).toBe('03 (três)');
    expect(numeroPorExtenso(21)).toBe('21 (vinte e um)');
  });

  it('usa o pronome pelo sexo do atendido', () => {
    expect(pronomeAtendido(Sexo.FEMININO).o).toBe('a atendida');
    expect(pronomeAtendido(Sexo.MASCULINO).o).toBe('o atendido');
    expect(pronomeAtendido(null).o).toBe('o(a) atendido(a)');
    expect(pronomeAtendido(Sexo.OUTRO).do).toBe('do(a) atendido(a)');
  });

  it('A: advertência por fato cita o motivo e a descrição', () => {
    const t = textoDocumento(registro({ nivel: NivelDisciplinar.ADVERTENCIA, origem: 'MANUAL' }));
    expect(t.titulo).toBe('Carta de Advertência Educativa');
    expect(t.paragrafos[0]).toBe(
      'Comunicamos que o atendido LUCAS MARTINS está recebendo a presente advertência em decorrência de agressão a colega.',
    );
    expect(t.paragrafos[1]).toBe('Empurrou um colega no intervalo.');
    expect(t.paragrafos).toContain('Solicitamos a devolução desta ADVERTÊNCIA, devidamente ASSINADA pelo responsável.');
  });

  it('B: advertência pela recomendação fala do acúmulo de 03 ocorrências, sem a descrição', () => {
    const t = textoDocumento(
      registro({ nivel: NivelDisciplinar.ADVERTENCIA, origem: 'RECOMENDACAO', sexoAssistido: Sexo.FEMININO }),
    );
    expect(t.paragrafos[0]).toContain('a atendida LUCAS MARTINS');
    expect(t.paragrafos[0]).toContain('acúmulo de 03 (três) ocorrências disciplinares');
    expect(t.paragrafos[2]).toMatch(/^A atendida foi orientada/);
    expect(t.paragrafos.join(' ')).not.toContain('Empurrou');
  });

  it('C: suspensão com dias úteis, retorno e causa', () => {
    const suspensao = { nivel: NivelDisciplinar.SUSPENSAO, suspensaoInicio: '2026-09-09', suspensaoFim: '2026-09-11' };
    const manual = textoDocumento(registro({ ...suspensao, origem: 'MANUAL' }));
    expect(manual.titulo).toBe('Termo de Suspensão Educativa');
    expect(manual.paragrafos[1]).toBe('A ocorrência que resultou na presente medida refere-se a Empurrou um colega no intervalo.');
    expect(manual.paragrafos[5]).toBe(
      'O atendido deverá cumprir suspensão pelo período de 03 (três) dias, podendo retornar às atividades no dia 14/09/2026 (segunda-feira).',
    );

    const grupoDeSegundaAQuarta = textoDocumento(
      registro({ ...suspensao, origem: 'MANUAL', suspensaoDiasDeAtividade: 2, suspensaoRetorno: '2026-09-14' }),
    );
    expect(grupoDeSegundaAQuarta.paragrafos[5]).toContain('02 (dois) dias');

    const acumulo = textoDocumento(registro({ ...suspensao, origem: 'RECOMENDACAO' }));
    expect(acumulo.paragrafos[1]).toContain('ao acúmulo de 03 (três) advertências');
  });
});
