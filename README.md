# @kousaku-maron/template-manager

npx コマンドでテンプレートをダウンロードし、プロジェクトをセットアップできます。

## 使い方

```bash
npx @kousaku-maron/template-manager --template=<テンプレート名> --dir=<出力先ディレクトリ>
```

### テンプレート一覧

| テンプレート名 | 説明 |
| --- | --- |
| `astro-cloudflare-blog` | Astro + Cloudflare を使ったブログテンプレート |
| `tauri-cloudflare-todo` | Tauri + Hono + better-auth で作る認証付きカンバンテンプレート |

### 例

```bash
npx @kousaku-maron/template-manager --template=astro-cloudflare-blog --dir=my-blog
npx @kousaku-maron/template-manager --template=tauri-cloudflare-todo --dir=my-kanban
```
