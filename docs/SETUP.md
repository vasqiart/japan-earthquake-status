# Setup Checklist - Access Token Gate

Quick setup guide to get `/?t=test123` working and display the main earthquake status page.

---

## 1) 事前確認（30秒）

- [ ] **`.env.local` がプロジェクト直下にある**
  - 場所: `package.json` と同じ階層
  - 確認コマンド:
    ```bash
    ls -la .env.local
    ```
  - なければ作成済みのテンプレートを編集

- [ ] **`.env.local` が git 管理されない**
  - `.gitignore` に `.env*` が含まれていることを確認
  - 確認コマンド:
    ```bash
    grep "\.env" .gitignore
    ```
  - 出力に `.env*` があれば OK

---

## 2) Supabase から値を取って貼る

### Step 1: Supabase Dashboard で値を取得

1. [Supabase Dashboard](https://app.supabase.com/) を開く
2. 対象プロジェクトを選択
3. 左メニュー → **Project Settings** (⚙️) → **API**
4. 以下をコピー:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` に使用
   - **service_role key** (⚠️ anon key ではない) → `SUPABASE_SERVICE_ROLE_KEY` に使用

### Step 2: `.env.local` を編集

1. プロジェクト直下の `.env.local` を開く
2. プレースホルダーを実際の値に置き換える:

   **Before (プレースホルダー):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   **After (実際の値):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **フォーマット注意:**
   - ✅ 引用符なし: `KEY=value` (NOT `KEY="value"`)
   - ✅ 前後スペースなし: `KEY=value` (NOT `KEY = value`)
   - ✅ 改行だけ（空行はOK）

4. 保存

---

## 3) devサーバー完全再起動（コピペ用）

### 現在動いているターミナルで:

1. **停止:**
   ```
   Ctrl+C
   ```

2. **キャッシュクリア + 再起動:**
   ```bash
   rm -rf .next
   npm run dev
   ```

### もし "Port 3000 is already in use" が出た場合:

```bash
# プロセス確認
lsof -i :3000

# 出力例:
# COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node    12345 user   23u  IPv4  ...      0t0  TCP *:3000 (LISTEN)

# PIDを確認して停止（12345を実際のPIDに置き換え）
kill -9 12345

# 再起動
npm run dev
```

### 確認:

- ターミナルに "Missing Supabase environment variables" が出ないこと
- サーバーが正常に起動すること

---

## 4) テストデータ投入（どっちか一つ）

### Option A: SQL Editor（推奨）

1. Supabase Dashboard → **SQL Editor**
2. 以下のSQLを貼り付けて **Run**:
   ```sql
   INSERT INTO public.access_tokens (email, token, expires_at)
   VALUES (
     'test@example.com',
     'test123',
     NOW() + INTERVAL '7 days'
   );
   ```
3. 確認: "Success. No rows returned" と表示されれば OK

### Option B: Table Editor

1. Supabase Dashboard → **Table Editor**
2. `access_tokens` テーブルを選択
3. **Insert row** をクリック
4. 以下を入力:
   - `email`: `test@example.com`
   - `token`: `test123`
   - `expires_at`: カレンダーアイコン → 未来の日付を選択（例: 7日後）
   - `used_at`: 空欄（null）
   - `created_at`: 空欄（自動入力）
5. **Save** をクリック

---

## 5) 動作確認（この順番固定）

### ① API エンドポイント確認

**URL:** `http://localhost:3000/api/access/verify?token=test123`

**期待される結果:**
```json
{
  "ok": true,
  "expiresAt": "2026-01-20T00:00:00.000Z",
  "email": "test@example.com"
}
```

**もし 500 エラー:**
- `.env.local` が読めていない
- → [トラブルシューティング](#6-うまくいかない時) の「500 & Missing Supabase env」を参照

**もし `{ ok: false, reason: "not_found" }`:**
- トークンがDBに存在しない
- → [トラブルシューティング](#6-うまくいかない時) の「ok:false not_found」を参照

**もし `{ ok: false, reason: "expired" }`:**
- トークンの期限切れ
- → [トラブルシューティング](#6-うまくいかない時) の「ok:false expired」を参照

### ② メインページ確認

**URL:** `http://localhost:3000/?t=test123`

**期待される結果:**
- メイン画面（地震ステータス）が表示される
- "Access expired" 画面は表示されない

**もし "Access expired" が表示される:**
- ①のAPI確認結果を確認
- トークンが有効か確認（DBで `expires_at` が未来か確認）

---

## 6) うまくいかない時

### 症状: 500 エラー & "Missing Supabase environment variables"

**原因:**
- `.env.local` が読めていない
- 再起動していない
- 値が空

**対処:**
```bash
# 1. .env.local の場所確認
ls -la .env.local
# package.json と同じ階層にあることを確認

# 2. .env.local の内容確認（値が入っているか）
cat .env.local
# NEXT_PUBLIC_SUPABASE_URL=... と SUPABASE_SERVICE_ROLE_KEY=... が空でないことを確認

# 3. 完全再起動
rm -rf .next
npm run dev
```

---

### 症状: `{ ok: false, reason: "not_found" }`

**原因:**
- DBに `test123` が入っていない

**対処:**
1. Supabase Dashboard → **Table Editor** → `access_tokens`
2. `token = test123` の行があるか確認
3. なければ [4) テストデータ投入](#4-テストデータ投入どっちか一つ) を実行

---

### 症状: `{ ok: false, reason: "expired" }`

**原因:**
- `expires_at` が過去の日付

**対処:**
1. Supabase Dashboard → **Table Editor** → `access_tokens`
2. `token = test123` の行を編集
3. `expires_at` を未来の日付に更新（例: 7日後）
4. 保存
5. 再度 [5) 動作確認](#5-動作確認この順番固定) を実行

---

## 完了条件

- [ ] `http://localhost:3000/api/access/verify?token=test123` → `{ ok: true }`
- [ ] `http://localhost:3000/?t=test123` → メイン画面表示
- [ ] ターミナルに "Missing Supabase environment variables" が出ない
