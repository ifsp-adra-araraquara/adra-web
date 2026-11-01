import { NivelDisciplinar } from '../enum/NivelDisciplinar';
import { ResumoDisciplinarDTO } from '../models/disciplinar/Disciplinar';
import { descreverQuantidades } from './disciplinar.util';

function resumo(parcial: Partial<ResumoDisciplinarDTO>): ResumoDisciplinarDTO {
  return {
    ocorrenciasAtivas: 0,
    advertenciasAtivas: 0,
    suspensoesAtivas: 0,
    uniformeAtivas: 0,
    faltamParaAdvertencia: 3,
    faltamParaSuspensao: 3,
    faltamParaPerderPasseio: 3,
    faltamParaRetornoComResponsavel: 3,
    suspensoAte: null,
    retornoComResponsavelPendente: false,
    perdeProximoPasseio: false,
    documentosPendentes: 0,
    ...parcial,
  };
}

describe('descreverQuantidades', () => {
  it('junta os níveis com vírgula e "e", no singular e no plural', () => {
    const r = resumo({ ocorrenciasAtivas: 4, advertenciasAtivas: 1, uniformeAtivas: 2 });
    expect(descreverQuantidades(r, null)).toBe('4 ocorrências, 1 advertência e 2 de uniforme');
    expect(descreverQuantidades(resumo({ ocorrenciasAtivas: 4, advertenciasAtivas: 1 }), null)).toBe(
      '4 ocorrências e 1 advertência',
    );
  });

  it('com nível, conta só aquele nível', () => {
    const r = resumo({ ocorrenciasAtivas: 4, suspensoesAtivas: 1 });
    expect(descreverQuantidades(r, NivelDisciplinar.SUSPENSAO)).toBe('1 suspensão');
    expect(descreverQuantidades(r, NivelDisciplinar.ADVERTENCIA)).toBe('nenhum registro ativo');
  });
});
