# app-button

Botão padronizado ADRA. É um wrapper fino em volta de um `<button>` nativo — eventos de clique funcionam com `(click)` direto no `<app-button>`, sem `output()` próprio, porque o clique borbulha do `<button>` interno como qualquer evento de DOM.

## Uso básico

```html
<app-button variant="primary" (click)="salvar()">Salvar</app-button>
<app-button variant="secondary" (click)="cancelar()">Cancelar</app-button>
<app-button variant="danger" (click)="excluir()">Excluir</app-button>
```

## Inputs

| Input | Tipo | Padrão | Descrição |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'danger'` | `'primary'` | Verde ADRA (`#007B5F`) / cinza (`#54585A`) / vermelho de alerta. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | — |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Igual ao atributo `type` nativo — use `type="submit"` para submeter um form. |
| `loading` | `boolean` | `false` | Mostra spinner, esconde o texto (mantendo a largura) e desabilita o botão automaticamente (bloqueia duplo clique). |
| `disabled` | `boolean` | `false` | Desabilita o botão. Combinado com `loading` via `effectiveDisabled` interno. |
| `block` | `boolean` | `false` | Ocupa 100% da largura do container (equivalente ao antigo `.btn-block`) — útil em formulários de tela cheia como login. |

## Exemplo: submit real com loading

```ts
protected salvando = signal(false);

protected salvar(): void {
  this.salvando.set(true);
  this.responsavelService.cadastrar(dto)
    .pipe(finalize(() => this.salvando.set(false)))
    .subscribe(...);
}
```

```html
<app-button type="submit" [loading]="salvando()" (click)="salvar()">
  Salvar responsável
</app-button>
```

Enquanto `salvando()` é `true`, o `<button>` interno fica com `disabled` nativo — cliques adicionais simplesmente não disparam, sem precisar de lógica extra de "trava duplo clique" no componente consumidor.
