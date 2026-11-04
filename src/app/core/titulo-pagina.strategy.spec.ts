import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { TituloPaginaStrategy } from './titulo-pagina.strategy';

@Component({ template: '' })
class Tela {}

describe('TituloPaginaStrategy (WCAG 2.4.2)', () => {
  it('monta o título da aba com o nome da tela e do sistema', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'disciplinar', title: 'Disciplinar', component: Tela },
          { path: 'sem-titulo', component: Tela },
        ]),
        { provide: TitleStrategy, useClass: TituloPaginaStrategy },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const title = TestBed.inject(Title);

    await harness.navigateByUrl('/disciplinar');
    expect(title.getTitle()).toBe('Disciplinar · ADRA Araraquara');

    await harness.navigateByUrl('/sem-titulo');
    expect(title.getTitle()).toBe('ADRA Araraquara');
  });
});
