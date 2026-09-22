/**
 * Configuração da aplicação.
 *
 * Os valores vêm das variáveis `NG_APP_*` injetadas em tempo de build (arquivo `.env`
 * local ou variáveis de ambiente do projeto na Vercel). Quando ausentes, caem nos
 * padrões de desenvolvimento definidos abaixo.
 *
 * ATENÇÃO: tudo aqui é embutido no bundle e fica visível para qualquer pessoa que
 * abrir a aplicação. Nunca coloque segredos neste arquivo nem em variáveis `NG_APP_*`.
 */
export const environment = {
  apiUrl: import.meta.env.NG_APP_API_URL ?? 'http://localhost:8080',
  supabaseUrl: import.meta.env.NG_APP_SUPABASE_URL ?? 'https://moorxvcnxesniwaaaksm.supabase.co',
  supabaseAnonKey:
    import.meta.env.NG_APP_SUPABASE_ANON_KEY ?? 'sb_publishable_ZV_APlGr2rAAQ05nYIDZRg_4UiPGXS1',
};
