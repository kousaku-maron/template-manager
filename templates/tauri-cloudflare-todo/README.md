# tauri-cloudflare-todo

Tauri (React) + Cloudflare Workers (Hono) + better-auth + Neon(PostgreSQL) で作る、認証付きのシンプルなカンバンテンプレートです。

## 構成

- `app`: Tauri デスクトップアプリ (React + Vite + TanStack Router)
- `backend`: Hono API on Cloudflare Workers
  - better-auth (email/password)
  - Neon(PostgreSQL) + Drizzle ORM
  - カード CRUD API

## セットアップ

### 1. 依存関係をインストール

```bash
pnpm install
```

### 2. Neon データベースを作成

Neon コンソールで PostgreSQL データベースを作成し、接続文字列 (`DATABASE_URL`) を取得してください。

### 3. backend の環境変数を設定

```bash
cd backend
cp .dev.vars.example .dev.vars
pnpm wrangler secret put DATABASE_URL
pnpm wrangler secret put BETTER_AUTH_SECRET
```

`DATABASE_URL` は Neon の接続文字列、`BETTER_AUTH_SECRET` は十分に長いランダム文字列を設定してください。

### 4. DB マイグレーションを適用

```bash
cd backend
pnpm db:migrate
```

### 5. app の環境変数を設定

```bash
cd app
cp .env.example .env
```

必要なら `VITE_API_BASE_URL` を変更してください。

## 開発起動

### backend + app(Tauri) を同時起動

```bash
pnpm dev
```

`pnpm dev` は backend(`wrangler dev`) を先に起動し、`/api/health` が応答してから app(`tauri dev`) を起動します。
デフォルトポートは backend `8787` / frontend `1420` です。`pnpm dev` 実行時は両ポートの既存リスナーを自動停止してから起動します。必要なら `BACKEND_PORT=8791 FRONTEND_PORT=1520 pnpm dev` のように変更できます。

## アプリアイコンの変更

`app/src-tauri/icons/icon.png` を差し替えて、以下のコマンドで全プラットフォーム用のアイコンを再生成します。

```bash
cd app
pnpm tauri icon src-tauri/icons/icon.png
```

512x512px 以上の PNG を推奨します。`.icns`(macOS)、`.ico`(Windows)、各サイズの PNG が `app/src-tauri/icons/` に生成されます。

## API 一覧

- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-out`
- `GET /api/me`
- `GET /api/cards`
- `POST /api/cards`
- `PATCH /api/cards/:id`
- `DELETE /api/cards/:id`
- `POST /api/reorder`
