const form = document.querySelector('#contact-form');
const status = document.querySelector('#form-status');
const button = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const config = window.CONTACT_FORM_CONFIG;
  if (!config?.url || !config?.publishableKey) {
    status.textContent = 'El formulario no está configurado. Intenta de nuevo más tarde.';
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  button.disabled = true;
  status.textContent = 'Enviando mensaje…';

  try {
    const response = await fetch(`${config.url}/functions/v1/send-contact-message`, {
      method: 'POST',
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Delivery failed');

    form.reset();
    status.textContent = '¡Gracias! Tu mensaje fue enviado correctamente.';
  } catch {
    status.textContent = 'No pudimos enviar el mensaje. Intenta nuevamente en unos minutos.';
  } finally {
    button.disabled = false;
  }
});
