-- JMA cache table for storing fetched XML data
CREATE TABLE IF NOT EXISTS public.jma_cache (
  id text PRIMARY KEY,              -- 常に 'eqvol' を使う
  latest_feed_id text,              -- Atom entry id
  latest_feed_updated timestamptz,   -- Atom entry updated
  latest_xml_url text,              -- Atom entry link (XML)
  latest_xml text,                  -- 取得したXML（そのまま保存）
  fetched_at timestamptz NOT NULL,   -- 取得時刻
  ok boolean NOT NULL DEFAULT false, -- 取得成功フラグ
  error text                         -- 失敗時の理由（内部用）
);

-- 初期行（Upsert運用）
INSERT INTO public.jma_cache (id, fetched_at, ok)
VALUES ('eqvol', now(), false)
ON CONFLICT (id) DO NOTHING;
