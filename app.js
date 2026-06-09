const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');
const navLinks = [...document.querySelectorAll('.main-nav a')];

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function parseEntries(markdown) {
  return markdown
    .split(/\r?\n---\r?\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split(/\r?\n/);
      const data = {};
      let i = 0;
      for (; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line.includes(':')) {
          break;
        }
        const [key, ...rest] = line.split(':');
        data[key.trim().toLowerCase()] = rest.join(':').trim();
      }
      data.body = lines.slice(i).join('\n').trim();
      return data;
    });
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatDate(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    return isoDate;
  }
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function renderNews(entries) {
  const container = document.getElementById('news-list');
  if (!container) {
    return;
  }

  if (entries.length === 0) {
    container.innerHTML = '<p class="empty">Noch keine News vorhanden.</p>';
    return;
  }

  entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  container.innerHTML = entries
    .map((entry) => {
      const title = escapeHtml(entry.title || 'Ohne Titel');
      const date = escapeHtml(formatDate(entry.date || '')); 
      const body = escapeHtml(entry.body || '');
      const link = entry.link
        ? `<a class="btn btn-secondary" href="${escapeHtml(entry.link)}" target="_blank" rel="noopener noreferrer">Mehr</a>`
        : '';

      return `
        <article class="card">
          <h3>${title}</h3>
          <p class="meta">${date}</p>
          <p>${body}</p>
          ${link}
        </article>
      `;
    })
    .join('');
}

function renderTour(entries) {
  const upcomingEl = document.getElementById('tour-upcoming');
  const pastEl = document.getElementById('tour-past');
  if (!upcomingEl || !pastEl) {
    return;
  }

  const upcoming = entries
    .filter((entry) => (entry.status || '').toLowerCase() === 'upcoming')
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const past = entries
    .filter((entry) => (entry.status || '').toLowerCase() === 'past')
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const card = (entry) => {
    const title = escapeHtml(entry.title || 'Auftritt');
    const location = escapeHtml(entry.location || 'Ort folgt');
    const date = escapeHtml(formatDate(entry.date || '')); 
    const body = escapeHtml(entry.body || '');
    return `
      <article class="tour-item">
        <h4>${title}</h4>
        <p class="meta">${date} | ${location}</p>
        <p>${body}</p>
      </article>
    `;
  };

  upcomingEl.innerHTML = upcoming.length ? upcoming.map(card).join('') : '<p class="empty">Keine kommenden Termine.</p>';
  pastEl.innerHTML = past.length ? past.map(card).join('') : '<p class="empty">Noch keine vergangenen Termine.</p>';
}

async function loadContent() {
  try {
    const [newsRes, tourRes] = await Promise.all([
      fetch('content/news.md'),
      fetch('content/tour.md')
    ]);

    const newsText = await newsRes.text();
    const tourText = await tourRes.text();

    renderNews(parseEntries(newsText));
    renderTour(parseEntries(tourText));
  } catch (error) {
    const newsContainer = document.getElementById('news-list');
    const upcomingEl = document.getElementById('tour-upcoming');
    const pastEl = document.getElementById('tour-past');
    const fallback = '<p class="empty">Inhalte konnten nicht geladen werden.</p>';
    if (newsContainer) {
      newsContainer.innerHTML = fallback;
    }
    if (upcomingEl) {
      upcomingEl.innerHTML = fallback;
    }
    if (pastEl) {
      pastEl.innerHTML = fallback;
    }
    console.error(error);
  }
}

function setupRevealObserver() {
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  revealEls.forEach((el, index) => {
    el.style.transitionDelay = `${index * 45}ms`;
    observer.observe(el);
  });
}

function setupActiveNav() {
  const sections = [...document.querySelectorAll('main section[id]')];
  const linkMap = new Map(
    navLinks.map((link) => [link.getAttribute('href')?.replace('#', ''), link])
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        navLinks.forEach((link) => link.classList.remove('active'));
        const id = entry.target.getAttribute('id');
        linkMap.get(id)?.classList.add('active');
      });
    },
    {
      rootMargin: '-40% 0px -45% 0px',
      threshold: 0
    }
  );

  sections.forEach((section) => observer.observe(section));
}

loadContent();
setupRevealObserver();
setupActiveNav();
