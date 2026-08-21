const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
const track = document.querySelector('.menu-track');
const categories = [...document.querySelectorAll('.menu-category-card')];
const previousCategory = document.querySelector('#previous-category');
const nextCategory = document.querySelector('#next-category');
const categoryCounter = document.querySelector('#category-counter');
let currentCategory = 0;

toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', String(open));
});

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
}));

function showCategory(index) {
  currentCategory = (index + categories.length) % categories.length;
  categories.forEach((category, categoryIndex) => {
    const isCurrent = categoryIndex === currentCategory;
    category.classList.toggle('is-current', isCurrent);
    category.setAttribute('aria-hidden', String(!isCurrent));
  });
  categoryCounter.textContent = `${String(currentCategory + 1).padStart(2, '0')} / ${String(categories.length).padStart(2, '0')}`;
}

previousCategory.addEventListener('click', () => showCategory(currentCategory - 1));
nextCategory.addEventListener('click', () => showCategory(currentCategory + 1));

let pointerStart = null;
track.addEventListener('pointerdown', (event) => { pointerStart = event.clientX; });
track.addEventListener('pointerup', (event) => {
  if (pointerStart === null) return;
  const distance = event.clientX - pointerStart;
  if (Math.abs(distance) > 50) showCategory(currentCategory + (distance < 0 ? 1 : -1));
  pointerStart = null;
});

showCategory(0);
