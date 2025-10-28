/* =========================
   Helpers
========================= */
const qs  = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

function getYouTubeId(url) {
  if (!url) return null;
  // Supports youtu.be/ID, youtube.com/watch?v=ID, and youtube.com/shorts/ID
  const short  = /youtu\.be\/([a-zA-Z0-9_-]{6,})/.exec(url);
  const watch  = /[?&]v=([a-zA-Z0-9_-]{6,})/.exec(url);
  const shorts = /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/.exec(url);
  return (short && short[1]) || (watch && watch[1]) || (shorts && shorts[1]) || null;
}

function buildYouTubeEmbedUrl(id) {
  const params = new URLSearchParams({
    autoplay: 1,
    rel: 0,
    modestbranding: 1,
    playsinline: 1
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function safeCreateIframe(id) {
  const iframe = document.createElement('iframe');
  iframe.src = buildYouTubeEmbedUrl(id);
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

  // Add origin if served over http(s)
  try {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      const url = new URL(iframe.src);
      url.searchParams.set('origin', location.origin);
      iframe.src = url.toString();
    }
  } catch {}
  return iframe;
}

/* =========================
   Setup video thumbnails
========================= */
qsa('.card.video').forEach(card => {
  const url = card.dataset.youtube;
  const id = getYouTubeId(url);
  const img = qs('img', card);
  if (id && img) {
    img.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    img.alt = img.alt || 'YouTube video thumbnail';
  }
});

/* =========================
   Lightbox elements
========================= */
const lb     = qs('#lightbox');
const lbImg  = qs('#lb-image');
const lbVid  = qs('#lb-video');
const btnX   = qs('.lb-close');
const btnPrev= qs('.lb-prev');
const btnNext= qs('.lb-next');

/* =========================
   Collect media items
========================= */
const mediaItems = qsa('.card').map((card, i) => ({
  el: card,
  type: card.dataset.type,              // "image" or "video"
  src: card.dataset.src || null,        // for images
  youtube: card.dataset.youtube || null,// for videos
  index: i
}));

let current = 0;

/* =========================
   Open and show items
========================= */
function openItem(i) {
  current = i;
  lb.style.display = 'flex';
  showItem(mediaItems[current]);
}

function showItem(item) {
  // Reset state
  lbImg.style.display = 'none';
  lbVid.style.display = 'none';
  lbVid.innerHTML = '';

  if (item.type === 'image' && item.src) {
    lbImg.src = item.src;
    lbImg.alt = qs('img', item.el)?.alt || '';
    lbImg.style.display = 'block';
  } else if (item.type === 'video' && item.youtube) {
    const id = getYouTubeId(item.youtube);
    if (id) {
      const iframe = safeCreateIframe(id);
      lbVid.appendChild(iframe);
      lbVid.style.display = 'block';

      // Fallback if embed is blocked
      const fallbackTimer = setTimeout(() => {
        // If iframe did not load or embedding is blocked, offer a link
        if (!iframe.contentWindow) {
          lbVid.innerHTML = `
            <div style="max-width:88vw;max-height:85vh;display:grid;place-items:center;color:#fff;text-align:center;padding:1rem">
              <p style="margin-bottom:0.75rem">This video cannot be embedded.</p>
              <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener"
                 style="color:#8ab4ff;text-decoration:underline">Watch on YouTube</a>
            </div>`;
        }
      }, 2000);

      iframe.addEventListener('load', () => clearTimeout(fallbackTimer));
    }
  }
}

function nextItem(step) {
  const nextIndex = (current + step + mediaItems.length) % mediaItems.length;
  openItem(nextIndex);
}

/* =========================
   Event listeners
========================= */
// Open on click
mediaItems.forEach(item => {
  item.el.addEventListener('click', () => openItem(item.index));
});

// Controls
btnX.addEventListener('click', () => {
  lb.style.display = 'none';
  lbVid.innerHTML = '';
});

btnPrev.addEventListener('click', e => {
  e.stopPropagation();
  nextItem(-1);
});

btnNext.addEventListener('click', e => {
  e.stopPropagation();
  nextItem(1);
});

// Close when clicking backdrop
lb.addEventListener('click', e => {
  if (e.target === lb) {
    lb.style.display = 'none';
    lbVid.innerHTML = '';
  }
});

// Keyboard controls
document.addEventListener('keydown', e => {
  if (lb.style.display === 'flex') {
    if (e.key === 'Escape') {
      lb.style.display = 'none';
      lbVid.innerHTML = '';
    } else if (e.key === 'ArrowRight') {
      nextItem(1);
    } else if (e.key === 'ArrowLeft') {
      nextItem(-1);
    }
  }
});

/* =========================
   Optional: preload full images for snappier lightbox
========================= */
mediaItems
  .filter(m => m.type === 'image' && m.src)
  .forEach(m => {
    const img = new Image();
    img.src = m.src;
  });

/* =========================
   Tip for local testing:
   If you open index.html from your filesystem and see embed errors,
   run a simple local server so origin is set:
   python3 -m http.server 8080
   Then visit http://localhost:8080
========================= */
