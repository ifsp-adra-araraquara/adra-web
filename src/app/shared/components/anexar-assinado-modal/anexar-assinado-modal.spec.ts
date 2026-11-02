import { TestBed } from '@angular/core/testing';

import { AnexarAssinadoModal } from './anexar-assinado-modal';
import { ArquivoService } from '../../../core/arquivo.service';
import { DisciplinarService } from '../../../core/disciplinar.service';
import { NivelDisciplinar } from '../../enum/NivelDisciplinar';
import { RegistroDisciplinarDTO } from '../../models/disciplinar/Disciplinar';

const registro = {
  registroId: 5,
  assistidoId: 7,
  nomeAssistido: 'Lucas Martins',
  nivel: NivelDisciplinar.ADVERTENCIA,
  sequencia: 1,
  documentoStatus: 'PENDENTE_ASSINATURA',
} as RegistroDisciplinarDTO;

async function montar(enviar = vi.fn(), marcarDocumentoDevolvido = vi.fn()) {
  await TestBed.configureTestingModule({
    imports: [AnexarAssinadoModal],
    providers: [
      { provide: ArquivoService, useValue: { enviar } },
      { provide: DisciplinarService, useValue: { marcarDocumentoDevolvido } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(AnexarAssinadoModal);
  fixture.componentRef.setInput('registro', registro);
  fixture.componentInstance.open.set(true);
  fixture.detectChanges();
  return fixture;
}

describe('AnexarAssinadoModal', () => {
  it('envia a foto do assinado e marca como devolvido', async () => {
    const enviar = vi.fn().mockResolvedValue({ arquivoId: 42 });
    const marcar = vi.fn().mockResolvedValue({ ...registro, documentoStatus: 'DEVOLVIDO_ASSINADO' });
    const fixture = await montar(enviar, marcar);
    const salvo = vi.fn();
    fixture.componentInstance.salvo.subscribe(salvo);

    fixture.componentInstance.arquivos.set([new File(['x'], 'assinado.pdf', { type: 'application/pdf' })]);
    await fixture.componentInstance.confirmar(registro);

    expect(enviar).toHaveBeenCalledWith('ASSISTIDO', 7, 'DOCUMENTO_DISCIPLINAR_ASSINADO', expect.any(File));
    expect(marcar).toHaveBeenCalledWith(5, 42);
    expect(salvo).toHaveBeenCalledWith(expect.objectContaining({ documentoStatus: 'DEVOLVIDO_ASSINADO' }));
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('sem arquivo, só marca como devolvido', async () => {
    const enviar = vi.fn();
    const marcar = vi.fn().mockResolvedValue(registro);
    const fixture = await montar(enviar, marcar);

    await fixture.componentInstance.confirmar(registro);

    expect(enviar).not.toHaveBeenCalled();
    expect(marcar).toHaveBeenCalledWith(5, null);
  });
});
