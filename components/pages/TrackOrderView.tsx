export default function TrackOrderView() {
  return (
    <main id="main-content" className="page-soft track-page">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <span className="is-current">Track order</span>
        </nav>

        <section className="track-hero" aria-labelledby="track-title">
          <p className="eyebrow">Order tracking</p>
          <h1 id="track-title">Where&apos;s my order?</h1>
          <p className="track-hero__lead">
            Enter the order number and the email address you used at checkout. Orders placed
            in this demo store are saved in this browser only, so tracking works offline.
          </p>
        </section>

        <div className="track-layout">
          <section className="track-panel" aria-labelledby="track-form-title">
            <header className="track-panel__head">
              <p className="eyebrow">Order lookup</p>
              <h2 id="track-form-title">Find your order</h2>
              <p>
                Use the order number from your confirmation email and the same email address
                you checked out with.
              </p>
            </header>

            <form className="card card--form track-form" id="track-form" noValidate>
              <div className="field-row">
                <label className="field">
                  <span className="field__label">Order number</span>
                  <input
                    className="input"
                    type="text"
                    name="number"
                    placeholder="ICN-123456"
                    autoComplete="off"
                    required
                  />
                  <span className="field__error" aria-live="polite" />
                </label>
                <label className="field">
                  <span className="field__label">Email address</span>
                  <input
                    className="input"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                  <span className="field__error" aria-live="polite" />
                </label>
              </div>
              <p className="form-error" id="track-error" role="alert" />
              <button className="btn track-form__submit" type="submit">
                Track order
              </button>
              <p className="field__hint">
                No order number? <a href="/account?tab=orders">Sign in to your account</a> or{" "}
                <a href="/contact">contact support</a>.
              </p>
            </form>

            <div id="track-result" className="track-result" hidden />
          </section>

          <aside className="track-help" aria-label="Help with tracking">
            <section className="track-help__card">
              <p className="eyebrow">Before you start</p>
              <h2>What you need</h2>
              <ul className="track-help__list">
                <li>
                  <span className="track-help__num">1</span>
                  <span>
                    Your order number, for example <b>ICN-123456</b>.
                  </span>
                </li>
                <li>
                  <span className="track-help__num">2</span>
                  <span>The email address you used when you placed the order.</span>
                </li>
                <li>
                  <span className="track-help__num">3</span>
                  <span>The same browser you used to place the order.</span>
                </li>
              </ul>
            </section>

            <section className="track-help__card">
              <p className="eyebrow">How it works</p>
              <h2>Three quick steps</h2>
              <ol className="track-help__steps">
                <li>Fill in both fields above.</li>
                <li>Choose <b>Track order</b>.</li>
                <li>Your saved order and its demo status appear below the form.</li>
              </ol>
            </section>

            <section className="track-help__card track-help__card--accent">
              <p className="eyebrow">Still stuck?</p>
              <h2>We can help</h2>
              <p>
                If the number will not work, send us a message with the name and email used
                on the order.
              </p>
              <a className="btn btn--light btn--sm btn--block" href="/contact">
                Contact support
              </a>
              <a className="btn btn--ghost btn--sm btn--block" href="/help">
                Delivery &amp; returns
              </a>
            </section>

            <p className="track-help__note">
              This is a demo store. Orders and tracking are stored only in this browser; no
              payment is taken and nothing is shipped.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
