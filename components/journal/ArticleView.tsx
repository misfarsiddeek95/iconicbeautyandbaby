import { articleDate, articles, getArticle } from "@/lib/site";

export default function ArticleView({ slug }: { slug: string }) {
  const article = getArticle(slug);
  if (!article) return null;

  const takeaways = article.takeaways ?? [];
  const related = articles.filter((item) => item.slug !== article.slug).slice(0, 3);

  return (
    <main id="main-content" className="journal-article-page">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <a href="/journal">Journal</a>
          <span>/</span>
          <span className="is-current">{article.title}</span>
        </nav>

        <div className="article-layout">
          <article className="article article--wide">
            <header className="article__head">
              <p className="eyebrow">{article.category} · Sample guide</p>
              <h1>{article.title}</h1>
              <p className="article__lead">{article.intro}</p>
              <div className="article__meta">
                <span className="status">Sample guide</span>
                <span className="dot" />
                <span>{articleDate(article.date)}</span>
                <span className="dot" />
                <span>{article.read}</span>
              </div>
            </header>

            <figure className="article__media">
              <img
                src={`/assets/img/${article.img}.svg`}
                alt=""
                width={600}
                height={600}
                loading="eager"
                decoding="async"
              />
            </figure>

            <div className="prose" id="art-body">
              {article.sections.map((section, index) => (
                <section id={`guide-${index + 1}`} key={section.h}>
                  <h2>{section.h}</h2>
                  {section.p.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>

            {takeaways.length ? (
              <aside className="article__takeaways" aria-labelledby="takeaways-title">
                <h2 id="takeaways-title">Key takeaways</h2>
                <ul>
                  {takeaways.map((takeaway) => (
                    <li key={takeaway}>{takeaway}</li>
                  ))}
                </ul>
              </aside>
            ) : null}

            <div className="article__author" style={{ marginTop: 28 }}>
              <span className="article__avatar">IB</span>
              <div>
                <p className="article__author-name">Iconic Beauty &amp; Baby editorial team</p>
                <p className="article__author-role">
                  Sample guide written for this prototype. Replace with a named author, role
                  and credentials before launch.
                </p>
              </div>
            </div>

            <p style={{ marginTop: 26 }}>
              <a className="btn btn--ghost" href="/journal">
                Back to the journal
              </a>
            </p>
          </article>

          <aside className="article-sidebar" aria-label="Article sidebar">
            <nav className="article-toc" aria-labelledby="toc-title">
              <h2 id="toc-title">In this guide</h2>
              <ol>
                {article.sections.map((section, index) => (
                  <li key={section.h}>
                    <a href={`#guide-${index + 1}`}>{section.h}</a>
                  </li>
                ))}
              </ol>
            </nav>

            <section className="sidebar-card" aria-labelledby="related-title">
              <h2 id="related-title">Related guides</h2>
              <ul className="sidebar-related">
                {related.map((item) => (
                  <li key={item.slug}>
                    <a href={`/journal/${item.slug}`}>
                      <img
                        src={`/assets/img/${item.img}.svg`}
                        alt=""
                        width={96}
                        height={96}
                        loading="lazy"
                        decoding="async"
                      />
                      <span>
                        <span className="sidebar-related__meta">{item.category}</span>
                        <b>{item.title}</b>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section className="sidebar-card sidebar-card--accent" aria-labelledby="sidebar-shop-title">
              <p className="eyebrow">From the shelf</p>
              <h2 id="sidebar-shop-title">Shop the edit</h2>
              <p>Browse the full range, or ask us which product suits your routine.</p>
              <a className="btn btn--light btn--sm btn--block" href="/shop">
                Shop all products
              </a>
              <a className="btn btn--ghost btn--sm btn--block" href="/contact">
                Ask a question
              </a>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
