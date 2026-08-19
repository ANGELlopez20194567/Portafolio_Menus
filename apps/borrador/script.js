const menuToggle=document.querySelector('.menu-toggle');
const navigation=document.querySelector('.main-nav');
const toast=document.querySelector('.toast');
let toastTimer;
menuToggle.addEventListener('click',()=>{const isOpen=navigation.classList.toggle('open');menuToggle.setAttribute('aria-expanded',isOpen)});
navigation.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{navigation.classList.remove('open');menuToggle.setAttribute('aria-expanded','false')}));
document.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click',()=>{toast.textContent=`La demo de ${button.dataset.demo} estara disponible proximamente.`;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),3200)}));
document.querySelector('#year').textContent=new Date().getFullYear();
