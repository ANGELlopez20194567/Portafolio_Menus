class QuoteCard extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;

    const title = this.getAttribute('title') || 'Tu menú digital';
    const label = this.getAttribute('label') || '¿Te gusta esta experiencia?';
    const description = this.getAttribute('description') || 'Lleva una carta clara, elegante y siempre disponible a tu restaurante.';
    const cta = this.getAttribute('cta') || 'Cotizar menú';
    const href = this.getAttribute('href') || '#cotizar';
    const included = (this.getAttribute('includes') || this.getAttribute('features') || 'Diseño responsive,Fácil de consultar,Personalizado a tu marca')
      .split(',').map(item => item.trim()).filter(Boolean);
    const idealFor = this.getAttribute('ideal-for') || 'Restaurantes que buscan una experiencia digital clara, atractiva y adaptada a su marca.';

    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host{position:fixed;right:clamp(12px,2.5vw,32px);bottom:clamp(12px,2.5vw,30px);z-index:1000;width:min(350px,calc(100vw - 24px));color:#f8f3e8;font-family:Arial,sans-serif;touch-action:none}
        *{box-sizing:border-box}.card{overflow:hidden;border:1px solid rgba(255,255,255,.2);border-radius:20px;background:rgba(35,55,42,.96);box-shadow:0 18px 55px rgba(12,24,17,.3);backdrop-filter:blur(14px);transition:width .2s ease,box-shadow .2s ease}.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 12px 8px 18px;cursor:grab;user-select:none}.bar:active{cursor:grabbing}.eyebrow,.section-label{margin:0;color:#e9be77;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.toggle{display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(255,255,255,.2);border-radius:50%;color:inherit;background:transparent;cursor:pointer}.toggle:hover,.toggle:focus-visible{background:rgba(255,255,255,.12);outline:none}.body{padding:3px 18px 18px}.body[hidden]{display:none}h2{margin:5px 0 8px;font:600 27px/1.08 Georgia,serif}.description{margin:0 0 15px;color:#d7ded8;font-size:14px;line-height:1.5}.detail-group{margin:0 0 15px}.section-label{margin-bottom:7px}ul{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}li{padding:6px 9px;border:1px solid rgba(255,255,255,.15);border-radius:999px;color:#e9ede8;font-size:11px}.ideal-for{margin:0;color:#d7ded8;font-size:12px;line-height:1.45}.cta{display:flex;align-items:center;justify-content:space-between;width:100%;padding:12px 14px;border-radius:11px;color:#24372b;background:#e9be77;font-size:13px;font-weight:800;text-decoration:none}.cta:hover,.cta:focus-visible{background:#f5d59e;outline:2px solid #fff;outline-offset:2px}.card.minimized{width:220px;margin-left:auto}.card.minimized .bar{padding:10px 10px 10px 15px}.card.minimized .eyebrow{white-space:nowrap}.hint{position:absolute;right:0;bottom:calc(100% + 7px);padding:5px 8px;border-radius:6px;color:#fff;background:rgba(28,34,29,.82);font-size:10px;opacity:0;pointer-events:none;transition:opacity .2s}.card:hover+.hint{opacity:1}
        @media(max-width:600px){:host{right:10px;bottom:10px;width:min(310px,calc(100vw - 20px))}.card{border-radius:16px}.body{padding:2px 15px 15px}h2{font-size:23px}.description{font-size:13px}.card.minimized{width:190px}.hint{display:none}}
        @media(prefers-reduced-motion:reduce){.card,.hint{transition:none}}
      </style>
      <section class="card" aria-label="Información y cotización del menú">
        <div class="bar" data-drag-handle>
          <p class="eyebrow">${this.escape(label)}</p>
          <button class="toggle" type="button" aria-expanded="true" aria-label="Minimizar tarjeta">−</button>
        </div>
        <div class="body">
          <h2>${this.escape(title)}</h2>
          <p class="description">${this.escape(description)}</p>
          <div class="detail-group"><p class="section-label">Incluye</p><ul>${included.map(item => `<li>${this.escape(item)}</li>`).join('')}</ul></div>
          <div class="detail-group"><p class="section-label">Ideal para</p><p class="ideal-for">${this.escape(idealFor)}</p></div>
          <a class="cta" href="${this.escape(href)}"><span>${this.escape(cta)}</span><span aria-hidden="true">→</span></a>
        </div>
      </section>
      <span class="hint">Arrastra para mover</span>`;

    this.card = root.querySelector('.card');
    this.body = root.querySelector('.body');
    this.toggle = root.querySelector('.toggle');
    this.toggle.addEventListener('click', () => this.setMinimized(!this.card.classList.contains('minimized')));
    root.querySelector('[data-drag-handle]').addEventListener('pointerdown', event => this.startDrag(event));
  }

  escape(value) {
    const node = document.createElement('span');
    node.textContent = value;
    return node.innerHTML;
  }

  setMinimized(minimized) {
    this.card.classList.toggle('minimized', minimized);
    this.body.hidden = minimized;
    this.toggle.textContent = minimized ? '+' : '−';
    this.toggle.setAttribute('aria-expanded', String(!minimized));
    this.toggle.setAttribute('aria-label', minimized ? 'Abrir tarjeta' : 'Minimizar tarjeta');
  }

  startDrag(event) {
    if (event.target.closest('button')) return;
    const rect = this.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const move = moveEvent => {
      const maxX = window.innerWidth - this.offsetWidth - 8;
      const maxY = window.innerHeight - this.offsetHeight - 8;
      this.style.left = `${Math.max(8, Math.min(maxX, moveEvent.clientX - offsetX))}px`;
      this.style.top = `${Math.max(8, Math.min(maxY, moveEvent.clientY - offsetY))}px`;
      this.style.right = 'auto'; this.style.bottom = 'auto';
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  }
}

customElements.define('quote-card', QuoteCard);
