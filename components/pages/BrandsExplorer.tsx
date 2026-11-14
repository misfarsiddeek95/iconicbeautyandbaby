"use client";

import { useMemo, useState } from "react";

export type BrandItem = {
  id: string;
  name: string;
  tag: string;
  count: number;
  inStock: number;
};

function letterFor(name: string): string {
  const first = (name.trim().charAt(0) || "#").toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

function letterSlug(letter: string): string {
  return letter === "#" ? "num" : letter.toLowerCase();
}

export default function BrandsExplorer({ brands }: { brands: BrandItem[] }) {
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState("all");

  const letters = useMemo(() => {
    const unique = new Set(brands.map((brand) => letterFor(brand.name)));
    return Array.from(unique).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [brands]);

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = brands
      .filter((brand) => activeLetter === "all" || letterFor(brand.name) === activeLetter)
      .filter((brand) => !term || `${brand.name} ${brand.tag}`.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));

    const map = new Map<string, BrandItem[]>();
    for (const brand of visible) {
      const letter = letterFor(brand.name);
      const bucket = map.get(letter);
      if (bucket) bucket.push(brand);
      else map.set(letter, [brand]);
    }

    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [brands, query, activeLetter]);

  const visibleCount = groups.reduce((sum, [, items]) => sum + items.length, 0);
  const filtered = visibleCount !== brands.length || query.trim() !== "" || activeLetter !== "all";

  function reset() {
    setQuery("");
    setActiveLetter("all");
  }

  return (
    <section className="brand-explorer" aria-labelledby="brand-explorer-title">
      <h2 className="sr-only" id="brand-explorer-title">
        Browse all brands
      </h2>

      <div className="brand-explorer__bar">
        <label className="brand-search" htmlFor="brand-search">
          <span className="brand-search__label">Search brands</span>
          <span className="brand-search__field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.6-3.6" />
            </svg>
            <input
              id="brand-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try “Dr.Rashel” or “skin care”"
              autoComplete="off"
            />
          </span>
        </label>
        <p className="brand-results" role="status" aria-live="polite">
          Showing <b>{visibleCount}</b> of {brands.length} brands
          {filtered ? (
            <button className="brand-reset" type="button" onClick={reset}>
              Clear filters
            </button>
          ) : null}
        </p>
      </div>

      <nav className="brand-az" aria-label="Filter brands by letter">
        <button
          type="button"
          className="brand-az__btn brand-az__btn--all"
          aria-pressed={activeLetter === "all"}
          onClick={() => setActiveLetter("all")}
        >
          All
        </button>
        {letters.map((letter) => (
          <button
            key={letter}
            type="button"
            className="brand-az__btn"
            aria-pressed={activeLetter === letter}
            onClick={() => setActiveLetter(letter)}
          >
            {letter}
          </button>
        ))}
      </nav>

      {groups.length === 0 ? (
        <div className="brand-empty">
          <h2>No brands found</h2>
          <p>Try a different spelling, or browse every letter of the directory.</p>
          <button className="btn btn--ghost btn--sm" type="button" onClick={reset}>
            Show all brands
          </button>
        </div>
      ) : (
        <div className="brand-directory">
          {groups.map(([letter, items]) => (
            <section
              key={letter}
              className="brand-letter-group"
              aria-labelledby={`brand-letter-${letterSlug(letter)}`}
            >
              <div className="brand-letter-group__head">
                <h2 id={`brand-letter-${letterSlug(letter)}`}>
                  <span className="sr-only">Brands starting with </span>
                  {letter}
                </h2>
                <span>
                  {items.length} {items.length === 1 ? "brand" : "brands"}
                </span>
              </div>
              <div className="brand-grid">
                {items.map((brand) => (
                  <a className="brand-entry" href={`/brand-${brand.id}`} key={brand.id}>
                    <span className="brand-entry__logo">
                      <img
                        src={`/assets/img/brand-${brand.id}.svg`}
                        alt=""
                        width={96}
                        height={96}
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                    <span className="brand-entry__body">
                      <span className="brand-entry__name">{brand.name}</span>
                      <span className="brand-entry__tag">{brand.tag}</span>
                      <span className="brand-entry__meta">
                        {brand.count} {brand.count === 1 ? "product" : "products"} ·{" "}
                        {brand.inStock} in stock
                      </span>
                    </span>
                    <span className="brand-entry__arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
