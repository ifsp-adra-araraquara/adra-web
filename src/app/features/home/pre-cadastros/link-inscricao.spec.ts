import { TestBed } from '@angular/core/testing';

import { LinkInscricao } from './link-inscricao';

describe('LinkInscricao', () => {
  it('monta o link público e a mensagem do WhatsApp com ele', async () => {
    const fixture = TestBed.createComponent(LinkInscricao);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const link = document.querySelector<HTMLInputElement>('#link-inscricao')!;
    expect(link.value).toBe(`${location.origin}/pre-cadastro`);
    const whatsapp = document.querySelector<HTMLAnchorElement>('a.whatsapp')!;
    expect(whatsapp.href.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(whatsapp.href)).toContain(`${location.origin}/pre-cadastro`);
  });
});
