import { calcularIdade } from './idade.util';

describe('idade.util', () => {
  it('conta só anos completos', () => {
    const hoje = new Date(2026, 9, 17); // 17/10/2026
    expect(calcularIdade('1985-10-17', hoje)).toBe(41);
    expect(calcularIdade('1985-10-18', hoje)).toBe(40);
    expect(calcularIdade(null, hoje)).toBeNull();
  });
});
