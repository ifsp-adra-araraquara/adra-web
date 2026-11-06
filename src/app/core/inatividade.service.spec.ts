import { DOCUMENT } from '@angular/common';
import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InatividadeService } from './inatividade.service';

const MINUTO_MS = 60_000;

describe('InatividadeService', () => {
  const destroyRef = { onDestroy: vi.fn() } as unknown as DestroyRef;
  let inatividade: InatividadeService;
  let aoExpirar: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    inatividade = TestBed.inject(InatividadeService);
    aoExpirar = vi.fn<() => void>();
  });

  afterEach(() => {
    vi.mocked(destroyRef.onDestroy).mock.calls.forEach(([limpar]) => limpar());
    vi.mocked(destroyRef.onDestroy).mockClear();
    vi.useRealTimers();
  });

  const interagir = () => TestBed.inject(DOCUMENT).dispatchEvent(new Event('pointerdown'));

  it('expira depois de 240 minutos sem interação', () => {
    inatividade.acompanhar(aoExpirar, destroyRef);

    vi.advanceTimersByTime(239 * MINUTO_MS);
    expect(aoExpirar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(MINUTO_MS);
    expect(aoExpirar).toHaveBeenCalled();
  });

  it('interação renova o prazo', () => {
    inatividade.acompanhar(aoExpirar, destroyRef);

    vi.advanceTimersByTime(200 * MINUTO_MS);
    interagir();
    vi.advanceTimersByTime(200 * MINUTO_MS);

    expect(aoExpirar).not.toHaveBeenCalled();
  });

  it('primeira interação depois do prazo expira em vez de renovar', () => {
    inatividade.acompanhar(aoExpirar, destroyRef);

    vi.setSystemTime(Date.now() + 241 * MINUTO_MS);
    interagir();

    expect(aoExpirar).toHaveBeenCalled();
  });

  it('sessão encerrada em outra aba encerra esta também', () => {
    inatividade.acompanhar(aoExpirar, destroyRef);

    window.dispatchEvent(new StorageEvent('storage', { key: 'adra.ultima-atividade', newValue: null }));

    expect(aoExpirar).toHaveBeenCalled();
  });

  it('atividade em outra aba não encerra esta', () => {
    inatividade.acompanhar(aoExpirar, destroyRef);

    window.dispatchEvent(new StorageEvent('storage', { key: 'adra.ultima-atividade', newValue: String(Date.now()) }));

    expect(aoExpirar).not.toHaveBeenCalled();
  });

  it('sem registro de atividade não expira', () => {
    expect(inatividade.expirou()).toBe(false);
  });
});
