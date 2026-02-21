const titleInput = document.querySelector('#title');
const slugInput = document.querySelector('#slug');
const authorInput = document.querySelector('#author');
const summaryInput = document.querySelector('#summary');
const tagsInput = document.querySelector('#tags');
const bodyInput = document.querySelector('#body');
const imagesInput = document.querySelector('#images');
const imageList = document.querySelector('#imageList');
const previewContent = document.querySelector('#previewContent');
const downloadButton = document.querySelector('#download');
const statusField = document.querySelector('#status');
const snippetButtons = document.querySelectorAll('[data-snippet]');

let attachedImages = [];

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-article';

const updatePreview = () => {
  const markdown = bodyInput.value.trim() || '*Start writing to see preview…*';
  previewContent.innerHTML = marked.parse(markdown);
};

const refreshImageList = () => {
  imageList.innerHTML = '';
  attachedImages.forEach((file) => {
    const item = document.createElement('li');
    item.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    imageList.append(item);
  });
};

const insertSnippet = (snippet) => {
  const start = bodyInput.selectionStart;
  const end = bodyInput.selectionEnd;
  const current = bodyInput.value;

  bodyInput.value = `${current.slice(0, start)}${snippet}${current.slice(end)}`;
  bodyInput.focus();
  bodyInput.selectionStart = bodyInput.selectionEnd = start + snippet.length;
  updatePreview();
};

titleInput.addEventListener('input', () => {
  if (!slugInput.dataset.edited) {
    slugInput.value = slugify(titleInput.value);
  }
});

slugInput.addEventListener('input', () => {
  slugInput.dataset.edited = 'true';
});

bodyInput.addEventListener('input', updatePreview);

snippetButtons.forEach((button) => {
  button.addEventListener('click', () => insertSnippet(button.dataset.snippet));
});

imagesInput.addEventListener('change', () => {
  attachedImages = Array.from(imagesInput.files);
  refreshImageList();
});

const getSafeImageName = (name, index) => {
  const dot = name.lastIndexOf('.');
  const extension = dot > -1 ? name.slice(dot).toLowerCase() : '';
  const base = dot > -1 ? name.slice(0, dot) : name;
  const safeBase = slugify(base);
  return `${String(index + 1).padStart(2, '0')}-${safeBase}${extension}`;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildArticleHtml = ({ title, author, summary, tags, bodyHtml }) => {
  const safeTitle = escapeHtml(title);
  const safeAuthor = author ? `<p class="meta"><strong>Author:</strong> ${escapeHtml(author)}</p>` : '';
  const safeSummary = summary
    ? `<p class="summary">${escapeHtml(summary)}</p>`
    : '';
  const tagList = tags.length
    ? `<p class="meta"><strong>Tags:</strong> ${tags.map((tag) => escapeHtml(tag)).join(', ')}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>
      body { margin: 0; font-family: Inter, system-ui, -apple-system, sans-serif; background: #f7f9fc; color: #172033; }
      main { max-width: 860px; margin: 0 auto; padding: 2rem 1rem 3rem; }
      article { background: #fff; border: 1px solid #d7dfef; border-radius: 14px; padding: 1.3rem 1.2rem; }
      h1 { margin-top: 0; }
      .summary { color: #42506b; }
      .meta { margin: 0.35rem 0; color: #32415e; font-size: 0.95rem; }
      hr { border: 0; border-top: 1px solid #d7dfef; margin: 1rem 0 1.2rem; }
      pre { background: #0f172a; color: #dde7ff; padding: 0.8rem; border-radius: 8px; overflow-x: auto; }
      blockquote { margin: 1rem 0; padding: 0.7rem 0.9rem; border-left: 4px solid #265ee9; background: #eef3ff; }
      img { max-width: 100%; height: auto; border-radius: 8px; }
    </style>
  </head>
  <body>
    <main>
      <article>
        <h1>${safeTitle}</h1>
        ${safeSummary}
        ${safeAuthor}
        ${tagList}
        <hr />
        ${bodyHtml}
      </article>
    </main>
  </body>
</html>`;
};

downloadButton.addEventListener('click', async () => {
  try {
    statusField.textContent = 'Preparing zip...';

    if (!titleInput.value.trim()) {
      throw new Error('Please add a title before downloading.');
    }

    const slug = slugify(slugInput.value || titleInput.value);
    const zip = new JSZip();
    const articleFolder = zip.folder(slug);
    const assetsFolder = articleFolder.folder('assets');

    const imageManifest = [];

    for (const [index, file] of attachedImages.entries()) {
      const safeName = getSafeImageName(file.name, index);
      assetsFolder.file(safeName, file);
      imageManifest.push({
        originalName: file.name,
        file: `assets/${safeName}`,
        size: file.size,
        type: file.type,
      });
    }

    const tags = tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const renderedBody = marked.parse(bodyInput.value.trim() || '# Untitled Article');

    const articleData = {
      title: titleInput.value.trim(),
      slug,
      author: authorInput.value.trim() || null,
      summary: summaryInput.value.trim() || null,
      tags,
      createdAt: new Date().toISOString(),
      format: 'html',
      bodyFile: 'article.html',
      images: imageManifest,
    };

    const articleHtml = buildArticleHtml({
      title: titleInput.value.trim(),
      author: authorInput.value.trim(),
      summary: summaryInput.value.trim(),
      tags,
      bodyHtml: renderedBody,
    });

    articleFolder.file('article.html', articleHtml);
    articleFolder.file('article.json', JSON.stringify(articleData, null, 2));
    articleFolder.file(
      'README.txt',
      `Unzip this folder into your repository's /articles/ directory.\n\nExpected path:\n/articles/${slug}/article.json\n/articles/${slug}/article.html\n/articles/${slug}/assets/*\n`
    );

    const output = await zip.generateAsync({ type: 'blob' });
    downloadBlob(output, `${slug}.zip`);

    statusField.textContent = 'Done! Your article zip was downloaded.';
  } catch (error) {
    statusField.textContent = error.message;
  }
});

updatePreview();
