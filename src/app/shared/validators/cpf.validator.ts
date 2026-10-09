import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cpf: string = (control.value ?? '').replace(/\D/g, '');

    if (!cpf) {
      return { required: true };
    }
    return cpfValido(cpf) ? null : { cpfInvalido: true };
  };
}

export function cpfValido(valor: string): boolean {
  const cpf = valor.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digitoVerificador = (tamanho: number): number => {
    let soma = 0;
    let peso = tamanho + 1;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * peso--;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return digitoVerificador(9) === Number(cpf[9]) && digitoVerificador(10) === Number(cpf[10]);
}

export function telefoneValido(valor: string): boolean {
  return /^$|^\d{10,11}$/.test(valor.replace(/\D/g, ''));
}

export function formatarCpf(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}