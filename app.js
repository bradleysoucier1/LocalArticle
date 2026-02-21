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

    const articleData = {
      title: titleInput.value.trim(),
      slug,
      author: authorInput.value.trim() || null,
      summary: summaryInput.value.trim() || null,
      tags: tagsInput.value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString(),
      format: 'markdown',
      bodyFile: 'article.md',
      images: imageManifest,
    };

    articleFolder.file('article.md', bodyInput.value.trim() || '# Untitled Article');
    articleFolder.file('article.json', JSON.stringify(articleData, null, 2));
    articleFolder.file(
      'README.txt',
      `Unzip this folder into your repository's /articles/ directory.\n\nExpected path:\n/articles/${slug}/article.json\n/articles/${slug}/article.md\n/articles/${slug}/assets/*\n`
    );

    const output = await zip.generateAsync({ type: 'blob' });
    downloadBlob(output, `${slug}.zip`);

    statusField.textContent = 'Done! Your article zip was downloaded.';
  } catch (error) {
    statusField.textContent = error.message;
  }
});

updatePreview();
