const feed = document.querySelector('#work-feed');
const cards = [...document.querySelectorAll('.project-card')];
const currentCard = document.querySelector('#current-card');

function setActiveCard(card) {
  cards.forEach((item) => item.classList.toggle('is-active', item === card));
  currentCard.textContent = String(card.dataset.index).padStart(2, '0');
}

const observer = new IntersectionObserver((entries) => {
  const focused = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (focused) setActiveCard(focused.target);
}, { root: feed, threshold: [0.45, 0.6, 0.75] });

cards.forEach((card) => observer.observe(card));
feed.addEventListener('keydown', (event) => {
  if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(event.key)) return;
  event.preventDefault();
  const activeIndex = cards.findIndex((card) => card.classList.contains('is-active'));
  const direction = ['ArrowDown', 'PageDown'].includes(event.key) ? 1 : -1;
  cards[Math.max(0, Math.min(cards.length - 1, activeIndex + direction))].scrollIntoView({ behavior: 'smooth', block: 'start' });
});
