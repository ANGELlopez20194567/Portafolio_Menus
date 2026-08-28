(function () {
  const api = window.MesaSupabase;
  const reservationArt = new Image(); reservationArt.src = 'assets/feudal-landscape.png';
  const elements = {
    date: document.querySelector('#date'), party: document.querySelector('#party-size'), section: document.querySelector('#section'),
    slots: document.querySelector('#time-slots'), partyLabel: document.querySelector('#party-label'), message: document.querySelector('#booking-message'),
    continueButton: document.querySelector('#continue-button'), bookingStep: document.querySelector('#booking-step'), detailsForm: document.querySelector('#details-form'),
    confirmation: document.querySelector('#confirmation'), stepLabel: document.querySelector('#step-label'), cardTitle: document.querySelector('#card-title'),
    cardIntro: document.querySelector('#card-intro'),
    calendar: document.querySelector('.guest-calendar'), calendarGrid: document.querySelector('#guest-calendar-grid'),
    calendarMonth: document.querySelector('#calendar-month'), previousMonth: document.querySelector('#calendar-previous'),
    nextMonth: document.querySelector('#calendar-next'), bookingOptions: document.querySelector('#booking-options'),
    selectedBookingDate: document.querySelector('#selected-booking-date')
  };
  const demoConfig = { name: 'Restaurante MESA', maximum_party_size: 12, open_weekdays: [0, 2, 3, 4, 5, 6], closed_dates: [], sections: [{ publicId: 'interior', name: 'Interior' }, { publicId: 'terraza', name: 'Terraza' }] };
  const today = new Date();
  const state = { restaurantId: null, config: demoConfig, demo: true, selectedSlot: null, result: null, calendarView: new Date(today.getFullYear(), today.getMonth(), 1) };

  function localDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function formatDate(value) { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)); }
  function formatTime(value) { return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)); }
  function formatCalendarDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
  }
  function setMessage(target, text, error) { target.textContent = text || ''; target.classList.toggle('is-error', Boolean(error)); }

  async function initialize() {
    elements.date.value = ''; elements.date.min = localDate();
    state.restaurantId = new URLSearchParams(location.search).get('restaurant') || api.config.restaurantId || localStorage.getItem('mesa-restaurant-id') || null;
    if (api.configured && state.restaurantId) {
      try {
        const remoteConfig = await api.getBookingConfig(state.restaurantId);
        if (remoteConfig) { state.config = remoteConfig; state.demo = false; }
        else throw new Error('Restaurante no disponible.');
      } catch (error) { console.warn(`No fue posible abrir el restaurante: ${error.message}`); }
    }
    populateControls(); renderCalendar();
  }

  function renderCalendar() {
    const year = state.calendarView.getFullYear();
    const month = state.calendarView.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayValue = localDate();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    elements.calendarMonth.textContent = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(state.calendarView);
    elements.calendarGrid.innerHTML = '';
    elements.previousMonth.disabled = state.calendarView <= currentMonth;

    for (let index = 0; index < firstWeekday; index += 1) {
      const spacer = document.createElement('span'); spacer.className = 'guest-calendar-empty'; spacer.setAttribute('aria-hidden', 'true'); elements.calendarGrid.append(spacer);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekday = new Date(year, month, day).getDay();
      const specialClosure = (state.config.closed_dates || []).find((item) => item.date === value);
      const isWeeklyClosed = Array.isArray(state.config.open_weekdays) && !state.config.open_weekdays.includes(weekday);
      const isClosed = isWeeklyClosed || Boolean(specialClosure);
      const closureLabel = specialClosure ? specialClosure.label : 'Cerrado';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'guest-calendar-day'; button.textContent = day;
      button.disabled = value < todayValue || isClosed;
      button.setAttribute('aria-label', `${formatCalendarDate(value)}${isClosed ? ` · Cerrado: ${closureLabel}` : ''}`);
      if (isClosed) button.title = closureLabel;
      button.classList.toggle('is-today', value === todayValue);
      button.classList.toggle('is-selected', value === elements.date.value);
      button.classList.toggle('is-closed', isClosed);
      button.classList.toggle('is-special-closure', Boolean(specialClosure));
      if (specialClosure) {
        const reason = document.createElement('small'); reason.textContent = specialClosure.label; button.append(reason);
      }
      button.addEventListener('click', () => selectDate(value));
      elements.calendarGrid.append(button);
    }
  }

  async function selectDate(value) {
    elements.date.value = value;
    elements.selectedBookingDate.textContent = formatCalendarDate(value);
    elements.calendar.classList.add('is-hidden');
    elements.bookingOptions.classList.remove('is-hidden');
    elements.stepLabel.textContent = 'Reservación · Disponibilidad';
    elements.cardTitle.textContent = 'Completa tu visita';
    elements.cardIntro.textContent = 'Ahora indica cuántos serán y el ambiente que prefieres.';
    renderCalendar();
    await loadSlots();
  }

  function changeDate() {
    elements.bookingOptions.classList.add('is-hidden');
    elements.calendar.classList.remove('is-hidden');
    elements.stepLabel.textContent = 'Reservación · Paso 01 de 03';
    elements.cardTitle.textContent = 'Elige el día de tu visita';
    elements.cardIntro.textContent = 'Selecciona una fecha disponible; después podrás elegir comensales, salón y horario.';
    renderCalendar();
  }

  function populateControls() {
    elements.party.innerHTML = '';
    for (let size = 1; size <= (state.config.maximum_party_size || 12); size += 1) {
      const option = document.createElement('option'); option.value = size; option.textContent = `${size} ${size === 1 ? 'persona' : 'personas'}`;
      if (size === 2) option.selected = true; elements.party.append(option);
    }
    elements.section.innerHTML = '<option value="">La mejor disponible</option>';
    state.config.sections.forEach((section) => { const option = document.createElement('option'); option.value = section.publicId; option.textContent = section.name; elements.section.append(option); });
  }

  async function loadSlots() {
    state.selectedSlot = null; elements.continueButton.disabled = true; elements.slots.innerHTML = '<p class="empty-inline">Buscando horarios…</p>';
    elements.partyLabel.textContent = `${elements.party.value} comensales`; setMessage(elements.message, '');
    try {
      const slots = state.demo ? ['13:00', '13:30', '14:00', '15:30', '19:00', '19:30'].map((time) => ({ starts_at: `${elements.date.value}T${time}:00-05:00` })) : await api.getSlots({ restaurantId: state.restaurantId, date: elements.date.value, partySize: Number(elements.party.value), sectionId: elements.section.value });
      renderSlots(slots);
    } catch (error) { elements.slots.innerHTML = ''; setMessage(elements.message, error.message, true); }
  }

  function renderSlots(slots) {
    elements.slots.innerHTML = '';
    if (!slots.length) { elements.slots.innerHTML = '<p class="empty-inline">No quedan mesas para esta selección.</p>'; return; }
    slots.forEach((slot) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = formatTime(slot.starts_at);
      button.addEventListener('click', () => { elements.slots.querySelectorAll('button').forEach((item) => item.classList.remove('is-selected')); button.classList.add('is-selected'); state.selectedSlot = slot; elements.continueButton.disabled = false; elements.continueButton.firstChild.textContent = `Continuar con ${formatTime(slot.starts_at)} `; });
      elements.slots.append(button);
    });
  }

  function showDetails() {
    if (!state.selectedSlot) return;
    elements.bookingStep.classList.add('is-hidden'); elements.detailsForm.classList.remove('is-hidden'); elements.stepLabel.textContent = 'Paso 02 de 03'; elements.cardTitle.textContent = 'Tus datos';
    elements.cardIntro.textContent = 'Déjanos tus datos de contacto para confirmar la mesa a tu nombre.';
    document.querySelector('#selection-date').textContent = formatDate(state.selectedSlot.starts_at);
    document.querySelector('#selection-detail').textContent = `${elements.party.value} personas · ${elements.section.selectedOptions[0].textContent}`;
  }
  function showBooking() {
    elements.detailsForm.classList.add('is-hidden'); elements.bookingStep.classList.remove('is-hidden');
    elements.stepLabel.textContent = 'Reservación · Disponibilidad'; elements.cardTitle.textContent = 'Completa tu visita';
    elements.cardIntro.textContent = 'Ahora indica cuántos serán y el ambiente que prefieres.';
  }

  async function submitReservation(event) {
    event.preventDefault();
    const submit = elements.detailsForm.querySelector('[type="submit"]'); submit.disabled = true; setMessage(document.querySelector('#details-message'), 'Confirmando…');
    const values = { restaurantId: state.restaurantId, startsAt: state.selectedSlot.starts_at, partySize: Number(elements.party.value), sectionId: elements.section.value, name: document.querySelector('#guest-name').value.trim(), email: document.querySelector('#guest-email').value.trim(), phone: document.querySelector('#guest-phone').value.trim(), notes: document.querySelector('#guest-notes').value.trim() };
    try {
      state.result = state.demo ? { reservation_code: `MESA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, lookup_token: crypto.randomUUID(), starts_at: values.startsAt, status: 'confirmed' } : await api.createReservation(values);
      state.result.name = values.name; state.result.email = values.email; state.result.partySize = values.partySize; state.result.sectionName = elements.section.selectedOptions[0].textContent;
      showConfirmation();
    } catch (error) { setMessage(document.querySelector('#details-message'), error.message, true); submit.disabled = false; }
  }

  function showConfirmation() {
    elements.detailsForm.classList.add('is-hidden'); elements.confirmation.classList.remove('is-hidden'); elements.stepLabel.textContent = 'Paso 03 de 03'; elements.cardTitle.textContent = 'Todo listo';
    elements.cardIntro.textContent = 'Tu lugar ha quedado reservado. Conserva el código para consultar tu visita.';
    document.querySelector('#confirmed-name').textContent = state.result.name; document.querySelector('#confirmed-date').textContent = formatDate(state.result.starts_at);
    document.querySelector('#confirmed-detail').textContent = `${state.result.partySize} personas · ${state.result.sectionName}`; document.querySelector('#confirmed-code').textContent = `ID ${state.result.reservation_code}`;
    document.querySelector('#email-note').textContent = state.demo ? 'Confirmación demostrativa: la reserva no se guardó.' : `La confirmación quedó registrada para enviarse a ${state.result.email}.`;
    document.querySelector('#lookup-code').value = state.result.reservation_code;
  }

  function downloadCard() {
    if (!state.result) return;
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 675; const context = canvas.getContext('2d');
    if (reservationArt.complete && reservationArt.naturalWidth) {
      const scale = Math.max(canvas.width / reservationArt.naturalWidth, canvas.height / reservationArt.naturalHeight);
      const width = reservationArt.naturalWidth * scale; const height = reservationArt.naturalHeight * scale;
      context.drawImage(reservationArt, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    } else { context.fillStyle = '#082e45'; context.fillRect(0, 0, canvas.width, canvas.height); }

    const shade = context.createLinearGradient(0, 0, 1200, 0); shade.addColorStop(0, 'rgba(7,28,39,.2)'); shade.addColorStop(.62, 'rgba(7,28,39,.08)'); shade.addColorStop(1, 'rgba(7,28,39,.68)'); context.fillStyle = shade; context.fillRect(0, 0, 1200, 675);
    context.fillStyle = 'rgba(244,226,183,.95)'; context.fillRect(46, 43, 716, 589); context.strokeStyle = '#d4a72c'; context.lineWidth = 3; context.strokeRect(58, 55, 692, 565);
    context.fillStyle = '#b52323'; context.fillRect(46, 43, 13, 589); context.fillStyle = '#082e45'; context.fillRect(59, 55, 691, 10);
    context.strokeStyle = '#b52323'; context.lineWidth = 2; context.beginPath(); context.moveTo(92, 137); context.lineTo(716, 137); context.stroke();
    context.fillStyle = '#082e45'; context.font = '900 28px Arial'; context.fillText('MESA', 92, 103); context.fillStyle = '#b52323'; context.font = '700 16px Arial'; context.fillText('RESERVA CONFIRMADA', 92, 126);
    context.fillStyle = '#171411'; context.font = '52px Georgia'; context.fillText(String(state.result.name).slice(0, 25), 92, 218);
    context.fillStyle = '#665536'; context.font = '20px Arial'; context.fillText('FECHA Y HORA', 92, 281); context.fillStyle = '#171411'; context.font = '30px Georgia'; context.fillText(formatDate(state.result.starts_at), 92, 322);
    context.fillStyle = '#665536'; context.font = '20px Arial'; context.fillText('VISITA', 92, 380); context.fillStyle = '#171411'; context.font = '28px Georgia'; context.fillText(`${state.result.partySize} personas · ${state.result.sectionName}`, 92, 421);
    context.fillStyle = '#b52323'; context.fillRect(92, 492, 460, 74); context.fillStyle = '#fff6df'; context.font = '700 17px Arial'; context.fillText('CÓDIGO DE RESERVA', 116, 519); context.font = '900 27px Arial'; context.fillText(state.result.reservation_code, 116, 551);
    context.fillStyle = '#d4a72c'; context.beginPath(); context.arc(1041, 530, 70, 0, Math.PI * 2); context.fill(); context.fillStyle = '#b52323'; context.beginPath(); context.arc(1041, 530, 58, 0, Math.PI * 2); context.fill(); context.fillStyle = '#f8e8bd'; context.font = '42px Georgia'; context.textAlign = 'center'; context.fillText('間', 1041, 546); context.textAlign = 'left';
    const link = document.createElement('a'); link.download = `reserva-${state.result.reservation_code}.png`; link.href = canvas.toDataURL('image/png'); link.click();
  }

  async function lookup(event) {
    event.preventDefault(); const target = document.querySelector('#lookup-result');
    if (state.demo) { target.textContent = 'La consulta estará disponible al activar el servicio de reservas.'; return; }
    try { const receipt = await api.getReceipt(document.querySelector('#lookup-code').value); target.textContent = receipt ? `${receipt.guest_name} · ${formatDate(receipt.starts_at)} · ${receipt.party_size} personas · ${receipt.status}` : 'Reserva no encontrada.'; } catch (error) { target.textContent = error.message; }
  }

  elements.party.addEventListener('change', loadSlots); elements.section.addEventListener('change', loadSlots);
  elements.previousMonth.addEventListener('click', () => { state.calendarView = new Date(state.calendarView.getFullYear(), state.calendarView.getMonth() - 1, 1); renderCalendar(); });
  elements.nextMonth.addEventListener('click', () => { state.calendarView = new Date(state.calendarView.getFullYear(), state.calendarView.getMonth() + 1, 1); renderCalendar(); });
  document.querySelector('#change-date').addEventListener('click', changeDate);
  elements.continueButton.addEventListener('click', showDetails); document.querySelector('#back-button').addEventListener('click', showBooking); elements.detailsForm.addEventListener('submit', submitReservation);
  document.querySelector('#download-card').addEventListener('click', downloadCard); document.querySelector('#restart-button').addEventListener('click', () => location.reload());
  document.querySelector('#open-lookup').addEventListener('click', () => document.querySelector('#lookup-bar').classList.toggle('is-hidden')); document.querySelector('#lookup-form').addEventListener('submit', lookup);
  initialize();
})();
