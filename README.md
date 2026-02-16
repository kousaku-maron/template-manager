# @kousaku-maron/template-manager

Download template directories from GitHub and scaffold projects from extracted files.

## Usage

```bash
npx @kousaku-maron/template-manager --template=owner/repo/templates/my-template
```

If you run without `--template`, the CLI shows an interactive template picker (`↑/↓` to move, `Enter` to select) and then asks the output directory (default: `.`):

```bash
node ./bin/cli.js
```

## Development

Source code is managed in TypeScript:

- Edit `/Users/kurinokousaku/Workspace/maron/template-manager/src/cli.ts`
- Build with `pnpm build` (outputs `/Users/kurinokousaku/Workspace/maron/template-manager/bin/cli.js`)

## CLI Check

Manual check examples:

```bash
node ./bin/cli.js --help
node ./bin/cli.js --version
node ./bin/cli.js --template=astro-cloudflare-blog --dir=tmp/astro-blog-test --force
node ./bin/cli.js --template=kousaku-maron/template-manager/templates/astro-cloudflare-blog --dir=my-blog
```

## Options

- `-t, --template` (required): Template source.
- `-d, --dir`: Output directory. Default is the template folder name.
- `-f, --force`: Overwrite destination directory if it exists.
- `-h, --help`: Show help.
- `-v, --version`: Show version.

## Template format

Both formats are supported:

- `owner/repo/path/to/template`
- `gh:owner/repo/path/to/template`
- Included template alias (current): `astro-cloudflare-blog`

## Included templates

- `kousaku-maron/template-manager/templates/astro-cloudflare-blog`

Examples:

```bash
npx @kousaku-maron/template-manager --template=cloudflare/templates/astro-blog-starter-template
npx @kousaku-maron/template-manager --template=owner/repo/templates/next-app --dir=my-app
npx @kousaku-maron/template-manager --template=astro-cloudflare-blog --dir=my-astro-cloudflare-blog
npx @kousaku-maron/template-manager --template=kousaku-maron/template-manager/templates/astro-cloudflare-blog --dir=my-astro-cloudflare-blog
```
