# Astro Cloudflare Blog Template (Turborepo)

Astro 単体のフルスタック構成で、Cloudflare Workers + Neon(PostgreSQL) + better-auth を使う最小ブログテンプレートです。
フロントエンドは `@astrojs/preact` と `tailwindcss` に対応しています。
モノレポ管理は Turborepo です。

## Tech Stack

- **Framework**: Astro
- **UI**: Preact / Tailwind CSS
- **Database**: Neon (PostgreSQL)
- **ORM**: Drizzle ORM
- **Auth**: better-auth
- **Hosting**: Cloudflare Workers
- **Monorepo**: Turborepo / pnpm

## 構成

- `frontend/`: Astro Webアプリ (UI + API routes)
- `frontend/db/schema/auth.ts`: better-auth schema（生成ファイル）
- `frontend/db/schema/app.ts`: アプリ固有schema
- `frontend/db/schema/index.ts`: Drizzle統合エントリ
- `frontend/db/migrations/`: Drizzle migrations
- `turbo.json`: Turborepo pipeline

## セットアップ

### 1. 前提条件

- Node.js 22+
- pnpm
- Cloudflare アカウント
- Neon アカウント

### 2. インストール

```bash
pnpm install
cp frontend/.dev.vars.example frontend/.dev.vars
```

### 3. Neon を準備

1. Neon でデータベースを作成
2. 接続文字列を取得 (`postgresql://...`)

### 4. 環境変数を設定

`frontend/.dev.vars` の以下を設定:

- `DATABASE_URL`: Neon の接続文字列
- `BETTER_AUTH_SECRET`: 十分に長いランダム文字列（32文字以上）
- `BETTER_AUTH_URL`: `http://127.0.0.1:4321`

### 5. Drizzle マイグレーション実行

```bash
pnpm db:migrate
```

better-auth schema を再生成する場合:

```bash
pnpm db:auth:generate
```

スキーマ変更時は `pnpm db:generate` で新規マイグレーションを生成。

### 6. 開発サーバーを起動

```bash
pnpm dev
```

App: `http://127.0.0.1:4321`

### 7. サインアップして最初の投稿を作成

1. `http://127.0.0.1:4321/signup` でアカウントを作成
2. `http://127.0.0.1:4321/login` でサインイン
3. `http://127.0.0.1:4321/new` で最初の投稿を作成

## Cloudflare デプロイ

### 手動デプロイ

`frontend/wrangler.toml` の `BETTER_AUTH_URL` を本番URLへ変更し、secret を登録:

```bash
cd frontend
wrangler kv namespace create SESSION
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
pnpm deploy
```

`wrangler kv namespace create SESSION` の結果で表示されるIDを、`frontend/wrangler.toml` の `TODO_SESSION_KV_NAMESPACE_ID` に設定してください。

### GitHub Actions による自動デプロイ

`.github/workflows/deploy.yml` が含まれており、`main` ブランチへの push 時に自動デプロイされます。

リポジトリの Settings > Secrets and variables > Actions に以下を設定してください:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API トークン

## API

- `GET /api/health`
- `GET /api/me`
- `GET /api/posts`
- `GET /api/posts/:id`
- `POST /api/posts`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST|GET /api/auth/*` (better-auth)

## 備考

- サインアップは `/signup`、サインインは `/login` から実行できます。
- 投稿作成にはログインが必要です。
- 投稿の更新/削除は投稿者本人のみ可能です。
