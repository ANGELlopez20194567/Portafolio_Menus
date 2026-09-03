const form = document.querySelector('#contact-form');
const status = document.querySelector('#form-status');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const subject = `Nuevo contacto de ${data.get('name')}`;
  const body = [
    `Nombre: ${data.get('name')}`,
    `Número telefónico: ${data.get('phone')}`,
    `Correo: ${data.get('email')}`,
    '',
    'Mensaje:',
    data.get('message') || 'Sin mensaje adicional.'
  ].join('\n');

  const mailto = `mailto:info@rayeltech.lat?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  status.textContent = 'Abriendo tu cliente de correo para completar el envío…';
  window.location.href = mailto;
});
