-- =====================================================================
-- ADRA — ajuste do menu lateral por perfil (12/11/2026)
--
-- O QUE MEXE: só as duas tabelas de CONFIGURAÇÃO do menu:
--   adra.modulo                 -> lista de itens de menu que existem
--   adra.nivel_permissao_modulo -> qual perfil vê qual item
-- NÃO MEXE em: atendidos, responsáveis, chamadas, registros disciplinares,
-- semanários, usuários, arquivos... Nenhum ALTER TABLE, nenhum DROP.
--
-- Mudanças:
--   1. Novo item de menu SEMANARIOS (1 linha em adra.modulo)
--   2. Coordenador passa a ver Semanários      (1 linha inserida)
--   3. Educador Social passa a ver Disciplinar (1 linha inserida)
--   4. Assistente Social deixa de ver Oficinas (1 linha removida — só o vínculo
--      perfil↔menu; a oficina e os dados dela continuam intactos)
--
-- Oficineiro: NÃO precisa de nada no banco (o menu dele agora vem do front).
-- Efeito: aparece no próximo login de cada usuário.
--
-- COMO RODAR (Supabase > SQL Editor):
--   Passo 1 -> rode a PARTE A (backup).
--   Passo 2 -> rode a PARTE B como está (termina em ROLLBACK): mostra a prévia
--              e desfaz tudo. Confira o resultado.
--   Passo 3 -> troque o ROLLBACK final da PARTE B por COMMIT e rode de novo.
--   Se algo der errado depois: PARTE C restaura do backup.
-- =====================================================================


-- =====================================================================
-- PARTE A — BACKUP (cópia das duas tabelas, em um schema separado)
-- O schema "backup" não é exposto pela API do Supabase.
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS backup;

CREATE TABLE backup.modulo_20261112 AS TABLE adra.modulo;
CREATE TABLE backup.nivel_permissao_modulo_20261112 AS TABLE adra.nivel_permissao_modulo;

-- Conferência: os números das duas colunas têm que bater.
SELECT
  (SELECT count(*) FROM adra.modulo)                             AS modulo_original,
  (SELECT count(*) FROM backup.modulo_20261112)                  AS modulo_backup,
  (SELECT count(*) FROM adra.nivel_permissao_modulo)             AS vinculos_original,
  (SELECT count(*) FROM backup.nivel_permissao_modulo_20261112)  AS vinculos_backup;


-- =====================================================================
-- PARTE B — MUDANÇAS (dentro de uma transação)
-- Rodar 1x com ROLLBACK (prévia), depois trocar por COMMIT.
-- Pode rodar mais de uma vez sem duplicar nada.
-- =====================================================================
BEGIN;

-- 1. Item de menu Semanários
INSERT INTO adra.modulo (codigo, nome_exibicao, rota, ativo)
SELECT 'SEMANARIOS', 'Semanários', '/semanarios', true
WHERE NOT EXISTS (SELECT 1 FROM adra.modulo WHERE codigo = 'SEMANARIOS');

-- 2 e 3. Coordenador -> Semanários; Educador Social -> Disciplinar
INSERT INTO adra.nivel_permissao_modulo (nivel_permissao_id, modulo_id, ordem, eh_padrao)
SELECT np.nivel_permissao_id,
       m.modulo_id,
       COALESCE((SELECT max(x.ordem) + 1 FROM adra.nivel_permissao_modulo x
                 WHERE x.nivel_permissao_id = np.nivel_permissao_id), 0),
       false
FROM adra.nivel_permissao np
JOIN adra.modulo m
  ON (np.nome::text = 'COORDENADOR'     AND m.codigo = 'SEMANARIOS')
  OR (np.nome::text = 'EDUCADOR_SOCIAL' AND m.codigo = 'DISCIPLINAR')
WHERE NOT EXISTS (
  SELECT 1 FROM adra.nivel_permissao_modulo e
  WHERE e.nivel_permissao_id = np.nivel_permissao_id AND e.modulo_id = m.modulo_id
);

-- 4. Assistente Social sem o menu Oficinas
DELETE FROM adra.nivel_permissao_modulo npm
USING adra.nivel_permissao np, adra.modulo m
WHERE npm.nivel_permissao_id = np.nivel_permissao_id
  AND npm.modulo_id = m.modulo_id
  AND np.nome::text = 'ASSISTENTE_SOCIAL'
  AND m.codigo = 'OFICINAS';

-- PRÉVIA: como fica o menu de cada perfil.
SELECT np.nome AS perfil, npm.ordem, m.codigo, m.nome_exibicao
FROM adra.nivel_permissao_modulo npm
JOIN adra.nivel_permissao np ON np.nivel_permissao_id = npm.nivel_permissao_id
JOIN adra.modulo m           ON m.modulo_id = npm.modulo_id
ORDER BY np.nome, npm.ordem;

ROLLBACK;   -- <- prévia: nada fica gravado. Troque por COMMIT para aplicar.


-- =====================================================================
-- PARTE C — DESFAZER (só se precisar). Volta as duas tabelas para o backup.
-- =====================================================================
-- BEGIN;
-- DELETE FROM adra.nivel_permissao_modulo;
-- INSERT INTO adra.nivel_permissao_modulo SELECT * FROM backup.nivel_permissao_modulo_20261112;
-- DELETE FROM adra.modulo WHERE codigo = 'SEMANARIOS'
--   AND NOT EXISTS (SELECT 1 FROM backup.modulo_20261112 b WHERE b.codigo = 'SEMANARIOS');
-- COMMIT;
--
-- Depois que tudo estiver ok em produção, o backup pode ser apagado:
-- DROP SCHEMA backup CASCADE;
