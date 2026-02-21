# LocalArticle Builder

A single-page, no-server tool for creating wiki-style article packages.

## What it does

- Write article content in Markdown.
- Use one-click snippets for specialized blocks (tips, warnings, code, and image links).
- Attach local image files.
- Click **Download Article (.zip)** to export a folder package ready for `/articles/`.

## Output structure

The downloaded zip contains:

- `<slug>/article.md`
- `<slug>/article.json`
- `<slug>/assets/*`
- `<slug>/README.txt`

Unzip into your repo's `articles` directory so content lands under `/articles/<slug>/`.

## Run locally

You can open `index.html` directly, or serve it locally:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.
