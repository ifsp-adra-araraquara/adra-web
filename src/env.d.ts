/**
 * Tipagem das variáveis de ambiente injetadas em tempo de build pelo @ngx-env/builder.
 *
 * Todas as `NG_APP_*` são opcionais: quando ausentes, `src/environments/environment.ts`
 * usa os valores padrão de desenvolvimento.
 */
declare interface Env {
  readonly NODE_ENV: string;
  readonly NG_APP_API_URL?: string;
  readonly NG_APP_SUPABASE_URL?: string;
  readonly NG_APP_SUPABASE_ANON_KEY?: string;
}

declare interface ImportMeta {
  readonly env: Env;
}
