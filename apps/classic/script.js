const menu = [
  ['entradas','01','Entradas', [['Bruschetta clásica','Pan artesanal, tomate, albahaca, ajo, aceite de oliva',145],['Carpaccio de res','Res, parmesano, arúgula, limón, aceite de oliva',220],['Burrata','Burrata, tomate cherry, albahaca, aceite de oliva',195],['Arancini','Arroz arborio, mozzarella, parmesano, salsa de tomate',175],['Antipasto italiano','Prosciutto, salami, aceitunas, quesos, pan artesanal',280]]],
  ['pastas','02','Pastas', [['Spaghetti Carbonara','Spaghetti, guanciale, huevo, pecorino, pimienta',230],['Fettuccine Alfredo','Fettuccine, mantequilla, parmesano, crema',210],['Lasagna Bolognese','Pasta, carne de res, tomate, bechamel, mozzarella, parmesano',245],['Penne Arrabbiata','Penne, tomate, ajo, chile, aceite de oliva',185],['Tagliatelle Bolognese','Tagliatelle, carne molida, tomate, zanahoria, apio, vino',225],['Ravioli de ricotta','Ravioli, ricotta, espinaca, parmesano, mantequilla',240],['Linguine Frutti di Mare','Linguine, camarón, calamar, mejillón, tomate, ajo',320]]],
  ['pizzas','03','Pizzas', [['Margherita','Tomate, mozzarella, albahaca, aceite de oliva',210],['Pepperoni','Tomate, mozzarella, pepperoni',240],['Prosciutto & Arúgula','Mozzarella, prosciutto, arúgula, parmesano',285],['Quattro Formaggi','Mozzarella, gorgonzola, parmesano, provolone',270],['Diavola','Tomate, mozzarella, salami picante, chile',255],['Funghi','Mozzarella, champiñones, parmesano, ajo',235]]],
  ['fuertes','04','Platos fuertes', [['Pollo Parmigiana','Pollo empanizado, tomate, mozzarella, parmesano',280],['Osso Buco','Jarrete de ternera, verduras, vino blanco, fondo de carne',390],['Saltimbocca alla Romana','Ternera, prosciutto, salvia, vino blanco',365],['Salmón al limón','Salmón, limón, mantequilla, hierbas',330],['Pollo al Marsala','Pollo, champiñones, vino Marsala',295]]],
  ['postres','05','Postres', [['Tiramisú','Mascarpone, café, huevo, cacao, soletas',145],['Panna Cotta','Crema, vainilla, azúcar, frutos rojos',130],['Cannoli Siciliano','Ricotta, masa frita, pistache, chocolate',140],['Torta Caprese','Chocolate, almendra, huevo, azúcar',150],['Gelato','Helado italiano, sabores a elegir',95]]],
  ['bebidas','06','Bebidas', [['Espresso','Café espresso',55],['Doppio Espresso','Doble espresso',70],['Cappuccino','Espresso, leche vaporizada, espuma',75],['Latte','Espresso, leche vaporizada',80],['Limonata','Limón, agua mineral, azúcar',70],['Aranciata','Naranja, agua mineral, azúcar',70],['Agua mineral italiana','Agua mineral',75],['Té italiano','Té, hierbas, limón',65]]]
];

const categoryImages = {
  entradas: [
    ['assets/entradas-editorial.png', 'Bruschetta y burrata con tomate cherry y albahaca sobre una mesa de trattoria'],
    ['assets/entradas-detail.png', 'Arancini italianos dorados con mozzarella y salsa de tomate']
  ],
  pastas: [
    ['assets/pastas-editorial.png', 'Fettuccine alfredo y tagliatelle bolognese servidos al estilo italiano'],
    ['assets/pastas-detail.png', 'Ravioli de ricotta y espinaca con mantequilla, salvia y parmesano']
  ],
  pizzas: [
    ['assets/pizzas-editorial.png', 'Pizza margherita recién horneada con mozzarella, tomate y albahaca'],
    ['assets/pizzas-detail.png', 'Pizza de prosciutto y arúgula con parmesano recién salida del horno']
  ],
  fuertes: [
    ['assets/fuertes-editorial.png', 'Osso buco italiano servido con gremolata'],
    ['assets/fuertes-detail.png', 'Pollo parmigiana con tomate y mozzarella gratinada']
  ],
  postres: [
    ['assets/postres-editorial.png', 'Tiramisú y panna cotta italiana con frutos rojos'],
    ['assets/postres-detail.png', 'Cannoli siciliani con ricotta, pistache y chocolate']
  ],
  bebidas: [
    ['assets/bebidas-editorial.png', 'Espresso, cappuccino y bebida cítrica italiana sobre una mesa de café'],
    ['assets/bebidas-detail.png', 'Limonata italiana con espresso y piel de limón']
  ]
};

document.querySelector('#menu-sections').innerHTML = menu.map(([id, number, title, dishes]) => `
  <section class="menu-section" id="${id}" aria-labelledby="${id}-title">
    <div class="section-title"><span>${number}</span><h2 id="${id}-title">${title}</h2></div>
    <div class="section-content">
      <div class="category-gallery" aria-label="Fotografías de ${title}">
        ${categoryImages[id].map(([source, alt], index) => `<figure class="category-photo category-photo-${index + 1}"><img src="${source}" alt="${alt}" ${id === 'entradas' && index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}></figure>`).join('')}
      </div>
      <div class="dishes">${dishes.map(([name, ingredients, price]) => `
        <article class="dish"><h3>${name}</h3><span class="dish-price">$${price}</span><p>${ingredients}</p></article>`).join('')}
      </div>
    </div>
  </section>`).join('');

const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav-links');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
}));
