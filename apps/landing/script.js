const feed = document.querySelector('#work-feed');
const cards = [...document.querySelectorAll('.project-card')];
const currentCard = document.querySelector('#current-card');
const previousButton = document.querySelector('#previous-card');
const nextButton = document.querySelector('#next-card');
const cursorMessage = document.querySelector('#cursor-message');

function setActiveCard(card) {
  cards.forEach((item) => item.classList.toggle('is-active', item === card));
  currentCard.textContent = String(card.dataset.index).padStart(2, '0');
  const activeIndex = cards.indexOf(card);
  previousButton.disabled = activeIndex === 0;
  nextButton.disabled = activeIndex === cards.length - 1;
}

function goToCard(direction) {
  const activeIndex = cards.findIndex((card) => card.classList.contains('is-active'));
  const targetIndex = Math.max(0, Math.min(cards.length - 1, activeIndex + direction));
  cards[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const observer = new IntersectionObserver((entries) => {
  const focused = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (focused) setActiveCard(focused.target);
}, { root: feed, threshold: [0.45, 0.6, 0.75] });

cards.forEach((card) => observer.observe(card));
feed.addEventListener('keydown', (event) => {
  if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(event.key)) return;
  event.preventDefault();
  const direction = ['ArrowDown', 'PageDown'].includes(event.key) ? 1 : -1;
  goToCard(direction);
});

previousButton.addEventListener('click', () => goToCard(-1));
nextButton.addEventListener('click', () => goToCard(1));

feed.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse') return;
  cursorMessage.style.left = `${event.clientX}px`;
  cursorMessage.style.top = `${event.clientY}px`;
});

feed.addEventListener('pointerenter', (event) => {
  if (event.pointerType === 'mouse') cursorMessage.classList.add('is-visible');
});

feed.addEventListener('pointerleave', () => cursorMessage.classList.remove('is-visible'));

setActiveCard(cards[0]);
