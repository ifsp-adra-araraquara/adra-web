# app-input

Campo de texto padronizado ADRA. Implementa `ControlValueAccessor`, então funciona com `formControlName`/`[formControl]` (reactive forms) ou `[(ngModel)]` (template-driven) como um `<input>` nativo qualquer.

## Uso básico

```html
<app-input
  label="Nome completo"
  formControlName="nomeCompleto"
  [required]="true"
  [errorMessage]="erro('nomeCompleto')"
/>
```

```html
<app-input label="Apelido" [(ngModel)]="apelido" name="apelido" />
```

## Inputs

| Input | Tipo | Padrão | Descrição |
|---|---|---|---|
| `label` | `string` | `''` | Texto do `<label>`. Omitido se vazio. |
| `hideLabel` | `boolean` | `false` | Mantém o label associado ao campo (leitor de tela) mas visualmente oculto — útil em barras de filtro compactas onde o rótulo é redundante visualmente (ex.: ao lado de um botão "Hoje"). |
| `type` | `'text' \| 'number' \| 'password' \| 'email' \| 'date'` | `'text'` | Tipo do campo. `password` ganha botão de mostrar/ocultar embutido. |
| `max` / `min` | `string` | `''` | Repassados como `max`/`min` nativos — úteis com `type="date"` (ex.: impedir data futura) ou `type="number"`. |
| `maxLength` | `number \| null` | `null` | Sobrepõe o `maxlength` nativo. Quando `mask` é `cpf`/`telefone`, já tem um default (14/15) — só use `maxLength` pra outros casos (ex.: limitar um título a 150 caracteres). |
| `mask` | `'none' \| 'cpf' \| 'telefone'` | `'none'` | Ver seção "Máscaras" abaixo. |
| `placeholder` | `string` | `''` | — |
| `id` / `name` | `string` | auto-gerado / `''` | Se `id` não for passado, um id único é gerado (o `<label>` sempre aponta pro campo certo). |
| `autocomplete` | `string` | `'off'` | Repassado como `autocomplete` nativo. |
| `disabled` | `boolean` | `false` | Também respeita `disable()`/`enable()` do FormControl. |
| `readonly` | `boolean` | `false` | Campo visível/selecionável mas não editável — diferente de `disabled` (que também tira o campo da submissão via `getRawValue()` só se o form o desabilitar). Útil pra "trava" um campo já preenchido (ex.: CPF depois de encontrado). |
| `required` | `boolean` | `false` | Marca visualmente com `*` e seta `required` no input nativo. |
| `errorMessage` | `string \| null` | `null` | Quando presente, mostra a borda de erro + texto abaixo do campo. **O componente não sabe nada sobre validação** — o consumidor computa essa string a partir do próprio `FormControl` (ex.: `computed(() => this.form.controls.cpf.invalid && this.form.controls.cpf.touched ? 'CPF inválido' : null)`). |

Não há `output()` próprio — o componente já emite mudanças via `ControlValueAccessor` (`formControlName`/`ngModel`), que é o jeito idiomático de reagir a mudanças de valor.

## Máscaras (`mask="cpf"` / `mask="telefone"`)

```html
<app-input label="CPF" formControlName="cpf" mask="cpf" [errorMessage]="erroCpf()" />
<app-input label="Telefone" formControlName="telefone" mask="telefone" [errorMessage]="erroTelefone()" />
```

**Importante:** quando `mask` está ativo, o valor que entra e sai do `FormControl`/`ngModel` é **sempre só dígitos** (ex.: `"12345678900"`), mesmo com a tela mostrando `"123.456.789-00"`. Isso significa:

- Validadores (`cpfValidator()`, `Validators.pattern(/^\d{10,11}$/)` etc.) devem validar dígitos, não a string formatada.
- Nunca é necessário chamar `somenteDigitos()`/`formatarCpf()` manualmente antes de enviar ao backend — o valor já chega limpo.
- Ao editar um registro existente, basta dar `patchValue({ cpf: '12345678900' })` com os dígitos — a formatação é só visual.

Reaproveita as mesmas funções puras usadas pelas diretivas `appMascaraCpf`/`appMascaraTelefone` (`formatarCpf`/`somenteDigitos` em `shared/validators/cpf.validator.ts`, `formatarTelefone` em `shared/utils/mascara.util.ts`) — não há lógica de formatação duplicada.

## Exemplo completo (form reativo)

```ts
protected erroCpf = computed(() => {
  const c = this.form.controls.cpf;
  if (!c.touched || c.valid) return null;
  return c.hasError('required') ? 'CPF é obrigatório' : 'CPF inválido';
});
```

```html
<app-input label="CPF" formControlName="cpf" mask="cpf" [required]="true" [errorMessage]="erroCpf()" />
```
