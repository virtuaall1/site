/**
 * Портфолио: репозитории и цифры профиля с GitHub.
 *
 * За сетью идём только когда человек доскроллил до раздела: два
 * запроса и разбор ответа не нужны тому, кто до портфолио не
 * долистал. Ответ держим в localStorage час — GitHub считает
 * запросы без ключа щедро, но не бесконечно.
 *
 * Данные чужие, поэтому в разметку они попадают только текстом:
 * React экранирует всё сам, никакого innerHTML.
 */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n.jsx';
import { Section, SectionHead } from './ui/Section.jsx';
import { Reveal, step } from './ui/Reveal.jsx';
import { GITHUB_USER, HIDDEN_REPOS, LINKS } from '../lib/content.js';

const API = `https://api.github.com/users/${GITHUB_USER}`;
const CACHE_KEY = 'gh-cache';
const CACHE_TTL = 60 * 60 * 1000;

const LANG_COLOR = {
  JavaScript: '#f1e05a', Python: '#3572A5', Java: '#b07219', HTML: '#e34c26',
  CSS: '#563d7c', TypeScript: '#3178c6', Shell: '#89e051', Dockerfile: '#384d54'
};

function cached() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (raw && Date.now() - raw.at < CACHE_TTL) return raw.data;
  } catch (e) { /* приватный режим или мусор в хранилище */ }
  return null;
}

export function Work({ id = 'work' }) {
  const { t, plural } = useI18n();
  const ref = useRef(null);
  const [data, setData] = useState(() => (typeof window === 'undefined' ? null : cached()));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (data || !ref.current || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();

      Promise.all([
        fetch(API).then(r => r.json()),
        fetch(`${API}/repos?per_page=100&sort=updated`).then(r => r.json())
      ])
        .then(([profile, repos]) => {
          if (!Array.isArray(repos)) throw new Error('GitHub ответил не списком');
          const fresh = {
            profile,
            repos: repos
              .filter(r => !r.fork && !HIDDEN_REPOS.includes(r.name))
              .sort((a, b) => b.stargazers_count - a.stargazers_count)
              .slice(0, 6),
            stars: repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
          };
          setData(fresh);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: fresh })); } catch (e) { /* noop */ }
        })
        .catch(() => setFailed(true));
    }, { rootMargin: '800px 0px' });

    io.observe(ref.current);
    return () => io.disconnect();
  }, [data]);

  const years = data ? Math.max(1, new Date().getFullYear() - new Date(data.profile.created_at).getFullYear()) : 0;

  return (
    <Section id={id} sunken>
      <div ref={ref}>
        <SectionHead kicker={t('work.kicker')} title={t('work.title')} lead={t('work.lead')} />

        {data && (
          <div className="mb-12 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              [data.repos.length, plural(data.repos.length, 'repos')],
              [data.stars, plural(data.stars, 'stars')],
              [data.profile.followers, plural(data.profile.followers, 'followers')],
              [years, plural(years, 'years')]
            ].map(([num, label], i) => (
              <Reveal key={label} delay={step(i)}>
                <div className="glass-plate grid gap-1 rounded-xl p-6 text-[0.82rem] text-faint">
                  <b className="tabular font-display text-[1.9rem] font-extrabold tracking-[-0.04em] text-paper">{num}</b>
                  <span>{label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {data
            ? data.repos.map((repo, i) => (
                <Reveal as="div" key={repo.id} delay={step(i)}>
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                     className="glass-plate group grid h-full content-start gap-2 rounded-xl p-6 transition-colors hover:border-rule hover:bg-glass-2">
                    <span className="font-display text-base font-semibold tracking-[-0.02em] transition-colors group-hover:text-acid">
                      {repo.name}
                    </span>
                    {repo.description && <span className="text-[0.88rem] text-muted">{repo.description}</span>}
                    <span className="flex items-center gap-4 text-[0.78rem] text-faint">
                      {repo.language && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full"
                                style={{ background: LANG_COLOR[repo.language] || '#8f8f97' }} />
                          {repo.language}
                        </span>
                      )}
                      {repo.stargazers_count > 0 && <span>★ {repo.stargazers_count}</span>}
                    </span>
                  </a>
                </Reveal>
              ))
            : !failed && Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="glass-plate min-h-[116px] animate-pulse rounded-xl" />
              ))}
        </div>

        {failed && <p className="text-[0.9rem] text-faint">{t('work.fail')}</p>}

        <a href={`${LINKS.github}?tab=repositories`} target="_blank" rel="noopener noreferrer"
           className="mt-8 inline-flex items-center gap-2 text-[0.9rem] text-muted transition-colors hover:text-paper">
          {t('work.all')} →
        </a>
      </div>
    </Section>
  );
}

export default Work;
