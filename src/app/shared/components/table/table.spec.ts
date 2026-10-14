import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Table, TableColumn } from './table';

interface Linha {
  nome: string;
}

@Component({
  imports: [Table],
  template: `
    <app-table [columns]="colunas" [data]="linhas" [rowClick]="abrir">
      <ng-template #rowActions><button type="button">Editar</button></ng-template>
    </app-table>
  `,
})
class Host {
  colunas: TableColumn<Linha>[] = [{ key: 'nome', header: 'Nome' }];
  linhas: Linha[] = [{ nome: 'Turma A' }];
  abertas: Linha[] = [];
  abrir = (linha: Linha) => this.abertas.push(linha);
}

describe('Table', () => {
  function criar() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return { host: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('chama rowClick com a linha ao clicar nela', () => {
    const { host, el } = criar();

    el.querySelector<HTMLElement>('tbody td')!.click();

    expect(host.abertas).toEqual([{ nome: 'Turma A' }]);
  });

  it('não chama rowClick ao clicar num botão da linha', () => {
    const { host, el } = criar();

    el.querySelector<HTMLElement>('tbody button')!.click();

    expect(host.abertas).toEqual([]);
  });
});
