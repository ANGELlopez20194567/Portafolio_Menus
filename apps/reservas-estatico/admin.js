(function () {
  'use strict';

  const api = window.MesaSupabase;
  const client = api && api.client;
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const statusNames = { pending: 'Pendiente', confirmed: 'Confirmada', seated: 'En mesa', completed: 'Completada', no_show: 'No llegó', cancelled: 'Cancelada' };
  const state = {
    session: null, restaurant: null, sections: [], tables: [],
    schedules: [], specialDates: [], reservations: [], occupancies: [], settings: null,
    reservationTotals: { past: 0, future: 0 }, reservationDateCounts: new Map(),
    calendarMonth: '', currentView: 'agenda', loading: false
  };
  const elements = {
    accessShell: document.querySelector('#access-shell'),
    authCard: document.querySelector('#auth-card'),
    configCard: document.querySelector('#config-card'),
    adminShell: document.querySelector('#admin-shell'),
    authForm: document.querySelector('#auth-form'),
    authMessage: document.querySelector('#auth-message'),
    status: document.querySelector('#admin-status'),
    reservationDate: document.querySelector('#reservation-date'),
    reservationDateTrigger: document.querySelector('#reservation-date-trigger'),
    reservationDateLabel: document.querySelector('#reservation-date-label'),
    reservationCalendar: document.querySelector('#reservation-calendar'),
    reservationCalendarGrid: document.querySelector('#reservation-calendar-grid'),
    reservationSearch: document.querySelector('#reservation-search'),
    reservationDialog: document.querySelector('#reservation-dialog'),
    reservationDetail: document.querySelector('#reservation-detail')
  };

  function localDate() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Cancun', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }
  function addDays(value, days) {
    const date = new Date(value + 'T12:00:00-05:00');
    date.setUTCDate(date.getUTCDate() + days);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Cancun', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(date);
  }
  function shiftMonth(value, amount) {
    const parts = value.split('-').map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1 + amount, 1));
    return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0');
  }
  function monthRange(value) {
    return {
      start: value + '-01T00:00:00-05:00',
      end: shiftMonth(value, 1) + '-01T00:00:00-05:00'
    };
  }
  function localDateFromTimestamp(value) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Cancun', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(value));
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }
  function setMessage(target, message, isError) {
    target.textContent = message || '';
    target.classList.toggle('is-error', Boolean(isError));
    target.classList.toggle('is-success', Boolean(message) && !isError);
  }
  function setStatus(message, isError) {
    elements.status.textContent = message;
    elements.status.classList.toggle('is-connected', !isError);
    elements.status.classList.toggle('is-error', Boolean(isError));
  }
  function showOnly(target) {
    [elements.authCard, elements.configCard].forEach(function (card) {
      card.classList.toggle('is-hidden', card !== target);
    });
    elements.accessShell.classList.remove('is-hidden');
    elements.adminShell.classList.add('is-hidden');
  }
  function showAdmin() {
    elements.accessShell.classList.add('is-hidden');
    elements.adminShell.classList.remove('is-hidden');
  }
  function friendlyError(error) {
    const message = error && error.message ? error.message : String(error || 'Error desconocido');
    const translations = {
      'Invalid login credentials': 'El correo o la contraseña no son correctos.',
      'Email not confirmed': 'La cuenta administrativa aún no está confirmada.'
    };
    return translations[message] || message;
  }
  function requireData(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  async function submitAuth(event) {
    event.preventDefault();
    const button = elements.authForm.querySelector('[type="submit"]');
    const values = new FormData(elements.authForm);
    const email = String(values.get('email') || '').trim().toLowerCase();
    const password = String(values.get('password') || '');
    button.disabled = true;
    setMessage(elements.authMessage, 'Comprobando acceso…');
    try {
      const result = await client.auth.signInWithPassword({ email: email, password: password });
      if (result.error) throw result.error;
      await handleSession(result.data.session);
    } catch (error) {
      setMessage(elements.authMessage, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function signOut() {
    await client.auth.signOut();
    state.session = null;
    state.restaurant = null;
    elements.authForm.reset();
    showOnly(elements.authCard);
  }

  async function handleSession(session) {
    state.session = session;
    if (!session) {
      showOnly(elements.authCard);
      return;
    }
    try {
      const result = await client.from('restaurants').select('*').eq('owner_user_id', session.user.id).maybeSingle();
      const restaurant = requireData(result);
      if (!restaurant) {
        await client.auth.signOut();
        state.session = null;
        showOnly(elements.authCard);
        setMessage(elements.authMessage, 'Este usuario no tiene acceso al restaurante de demostración.', true);
        return;
      }
      state.restaurant = restaurant;
      localStorage.setItem('mesa-restaurant-id', restaurant.public_id);
      await loadDashboard();
      showAdmin();
    } catch (error) {
      showOnly(elements.authCard);
      setMessage(elements.authMessage, 'No fue posible abrir el panel: ' + friendlyError(error), true);
    }
  }

  async function loadDashboard() {
    if (state.loading || !state.restaurant) return;
    state.loading = true;
    setStatus('Sincronizando datos…');
    const date = elements.reservationDate.value || localDate();
    const rangeStart = date + 'T00:00:00-05:00';
    const rangeEnd = addDays(date, 1) + 'T00:00:00-05:00';
    const now = new Date().toISOString();
    const countedStatuses = ['pending', 'confirmed', 'seated', 'completed', 'no_show'];
    const selectedMonth = date.slice(0, 7);
    const calendarRange = monthRange(selectedMonth);
    try {
      const results = await Promise.all([
        client.from('sections').select('*').eq('restaurant_id', state.restaurant.id).order('display_order').order('name'),
        client.from('dining_tables').select('*').eq('restaurant_id', state.restaurant.id).order('table_number'),
        client.from('service_periods').select('*').eq('restaurant_id', state.restaurant.id).order('weekday').order('start_time'),
        client.from('reservation_settings').select('*').eq('restaurant_id', state.restaurant.id).maybeSingle(),
        client.from('reservations').select('*').eq('restaurant_id', state.restaurant.id).gte('starts_at', rangeStart).lt('starts_at', rangeEnd).order('starts_at'),
        client.from('table_occupancies').select('table_id,reservation_id,active,kind').eq('restaurant_id', state.restaurant.id).eq('active', true),
        client.from('reservations').select('id', { count: 'exact', head: true }).eq('restaurant_id', state.restaurant.id).lt('starts_at', now).in('status', countedStatuses),
        client.from('reservations').select('id', { count: 'exact', head: true }).eq('restaurant_id', state.restaurant.id).gte('starts_at', now).in('status', countedStatuses),
        client.from('reservations').select('starts_at,status').eq('restaurant_id', state.restaurant.id).gte('starts_at', calendarRange.start).lt('starts_at', calendarRange.end).neq('status', 'cancelled'),
        client.from('special_dates').select('*').eq('restaurant_id', state.restaurant.id).gte('service_date', localDate()).order('service_date')
      ]);
      results.forEach(function (result) { if (result.error) throw result.error; });
      state.sections = results[0].data || [];
      state.tables = results[1].data || [];
      state.schedules = results[2].data || [];
      state.settings = results[3].data;
      state.reservations = results[4].data || [];
      state.occupancies = results[5].data || [];
      state.reservationTotals.past = results[6].count || 0;
      state.reservationTotals.future = results[7].count || 0;
      updateCalendarCounts(selectedMonth, results[8].data || []);
      state.specialDates = results[9].data || [];
      configureRestaurantLinks();
      renderAll();
      setStatus('Datos actualizados · Todos los cambios se guardan automáticamente.');
    } catch (error) {
      setStatus('No fue posible cargar los datos: ' + friendlyError(error), true);
      throw error;
    } finally {
      state.loading = false;
    }
  }

  function configureRestaurantLinks() {
    const params = '?restaurant=' + encodeURIComponent(state.restaurant.public_id);
    document.querySelector('#public-link').href = 'reservar.html' + params;
    document.querySelector('#new-reservation').href = 'reservar.html' + params + '&source=admin';
    document.querySelector('#tab-reservas .toolbar a').href = 'reservar.html' + params + '&source=admin';
    document.querySelector('#admin-user').textContent = state.session.user.email || '';
  }
  function sectionName(id) {
    const section = state.sections.find(function (item) { return item.id === Number(id); });
    return section ? section.name : 'Sin sección';
  }
  function reservationTime(value) {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Cancun', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(value));
  }
  function reservationDateTime(value) {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Cancun', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(value));
  }
  function updateCalendarCounts(month, reservations) {
    const counts = new Map();
    reservations.forEach(function (item) {
      const date = localDateFromTimestamp(item.starts_at);
      counts.set(date, (counts.get(date) || 0) + 1);
    });
    state.calendarMonth = month;
    state.reservationDateCounts = counts;
  }
  function renderCalendar() {
    const selectedDate = elements.reservationDate.value || localDate();
    const month = state.calendarMonth || selectedDate.slice(0, 7);
    const parts = month.split('-').map(Number);
    const year = parts[0];
    const monthIndex = parts[1] - 1;
    const firstWeekday = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const monthLabel = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, monthIndex, 1)));
    document.querySelector('#calendar-month-label').textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    const cells = [];
    for (let empty = 0; empty < firstWeekday; empty += 1) cells.push('<span class="calendar-empty" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = month + '-' + String(day).padStart(2, '0');
      const count = state.reservationDateCounts.get(date) || 0;
      const classes = ['calendar-day'];
      if (count) classes.push('has-reservations');
      if (date === selectedDate) classes.push('is-selected');
      if (date === localDate()) classes.push('is-today');
      const description = count ? ' · ' + count + (count === 1 ? ' reserva' : ' reservas') : '';
      cells.push('<button class="' + classes.join(' ') + '" type="button" data-calendar-date="' + date +
        '" aria-label="' + day + ' de ' + escapeHtml(monthLabel) + description + '"' +
        (date === selectedDate ? ' aria-pressed="true"' : '') + '><span>' + day + '</span>' +
        (count ? '<small>' + count + '</small>' : '') + '</button>');
    }
    elements.reservationCalendarGrid.innerHTML = cells.join('');
    elements.reservationDateLabel.textContent = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Cancun', day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(selectedDate + 'T12:00:00-05:00'));
  }
  async function loadCalendarMonth(month) {
    state.calendarMonth = month;
    document.querySelector('#calendar-month-label').textContent = 'Cargando…';
    elements.reservationCalendarGrid.innerHTML = '<p class="calendar-loading">Buscando reservas…</p>';
    const range = monthRange(month);
    try {
      const result = await client.from('reservations').select('starts_at,status').eq('restaurant_id', state.restaurant.id)
        .gte('starts_at', range.start).lt('starts_at', range.end).neq('status', 'cancelled');
      if (result.error) throw result.error;
      if (state.calendarMonth !== month) return;
      updateCalendarCounts(month, result.data || []);
      renderCalendar();
    } catch (error) {
      if (state.calendarMonth !== month) return;
      setStatus('No se pudieron cargar las fechas con reservas: ' + friendlyError(error), true);
      renderCalendar();
    }
  }
  function setCalendarOpen(open) {
    elements.reservationCalendar.hidden = !open;
    elements.reservationDateTrigger.setAttribute('aria-expanded', String(open));
  }

  function renderAll() {
    renderMetrics(); renderReservations(); renderSections(); renderTables();
    renderSchedules(); renderSpecialDates(); renderSummary(); renderSettings(); renderCalendar();
  }
  function activeReservations() {
    return state.reservations.filter(function (item) { return item.status !== 'cancelled' && item.status !== 'no_show'; });
  }
  function renderMetrics() {
    const active = activeReservations();
    document.querySelector('#metric-reservations').textContent = active.length;
    document.querySelector('#metric-guests').textContent = active.reduce(function (sum, item) { return sum + Number(item.party_size); }, 0);
    document.querySelector('#metric-past').textContent = state.reservationTotals.past;
    document.querySelector('#metric-future').textContent = state.reservationTotals.future;
    document.querySelector('#metric-tables').textContent = state.tables.filter(function (item) { return item.active; }).length;
    const now = new Date();
    const next = active.find(function (item) { return new Date(item.starts_at) >= now && item.status === 'confirmed'; });
    document.querySelector('#metric-next').textContent = next ? reservationTime(next.starts_at) : '—';
    document.querySelector('#metric-next-name').textContent = next ? next.guest_name + ' · ' + next.party_size + ' personas' : 'Sin llegadas';
  }
  function reservationMarkup(item) {
    const sectionId = item.assigned_section_id || item.preferred_section_id;
    const statuses = Object.keys(statusNames).map(function (value) {
      return '<option value="' + value + '"' + (value === item.status ? ' selected' : '') + '>' + statusNames[value] + '</option>';
    }).join('');
    return '<article class="reservation-row" data-reservation-id="' + item.id + '"><time>' +
      escapeHtml(reservationTime(item.starts_at)) + '</time>' +
      '<span class="avatar">' + escapeHtml((item.guest_name || '?').charAt(0)) + '</span><div><strong>' +
      escapeHtml(item.guest_name) + '</strong><span>' + item.party_size + ' personas · ' +
      escapeHtml(sectionName(sectionId)) + ' · ' + escapeHtml(item.public_code) + '</span><small>' +
      escapeHtml(item.guest_email) + (item.guest_phone ? ' · ' + escapeHtml(item.guest_phone) : '') +
      '</small></div><button class="reservation-open" type="button" data-open-reservation="' + item.id +
      '" aria-label="Abrir detalles de la reserva de ' + escapeHtml(item.guest_name) + '">Ver</button>' +
      '<select aria-label="Estado de la reserva de ' + escapeHtml(item.guest_name) + '" data-reservation-status="' + item.id + '" class="status-' +
      escapeHtml(item.status) + '">' + statuses + '</select></article>';
  }
  function filteredReservations() {
    const search = elements.reservationSearch.value.toLowerCase().trim();
    if (!search) return state.reservations;
    return state.reservations.filter(function (item) {
      return [item.public_code, item.guest_name, item.guest_email, item.guest_phone || ''].some(function (value) {
        return String(value).toLowerCase().includes(search);
      });
    });
  }
  async function updateReservationStatus(id, nextStatus) {
    const result = await client.from('reservations').update({
      status: nextStatus, cancelled_at: nextStatus === 'cancelled' ? new Date().toISOString() : null
    }).eq('id', id).eq('restaurant_id', state.restaurant.id);
    if (result.error) throw result.error;
  }
  function bindReservationInteractions(container) {
    container.querySelectorAll('[data-reservation-status]').forEach(function (select) {
      select.addEventListener('click', function (event) { event.stopPropagation(); });
      select.addEventListener('change', async function (event) {
        event.stopPropagation();
        select.disabled = true;
        const id = Number(select.dataset.reservationStatus);
        const nextStatus = select.value;
        try {
          await updateReservationStatus(id, nextStatus);
          await loadDashboard();
        } catch (error) {
          setStatus('No se pudo actualizar la reserva: ' + friendlyError(error), true);
          renderAll();
        }
      });
    });
    container.querySelectorAll('[data-reservation-id]').forEach(function (row) {
      row.addEventListener('click', function (event) {
        if (event.target.closest('select,button,a,input')) return;
        openReservationDetail(Number(row.dataset.reservationId));
      });
    });
    container.querySelectorAll('[data-open-reservation]').forEach(function (button) {
      button.addEventListener('click', function () { openReservationDetail(Number(button.dataset.openReservation)); });
    });
  }
  function detailField(label, value, wide) {
    return '<div class="detail-field' + (wide ? ' is-wide' : '') + '"><span>' + escapeHtml(label) +
      '</span><strong>' + escapeHtml(value || '—') + '</strong></div>';
  }
  function openReservationDetail(id) {
    const item = state.reservations.find(function (reservation) { return reservation.id === id; });
    if (!item) return;
    const sectionId = item.assigned_section_id || item.preferred_section_id;
    const tableNames = state.occupancies.filter(function (occupancy) {
      return occupancy.reservation_id === item.id;
    }).map(function (occupancy) {
      const table = state.tables.find(function (candidate) { return candidate.id === occupancy.table_id; });
      return table ? table.table_number : null;
    }).filter(Boolean).join(', ');
    const statuses = Object.keys(statusNames).map(function (value) {
      return '<option value="' + value + '"' + (value === item.status ? ' selected' : '') + '>' + statusNames[value] + '</option>';
    }).join('');
    document.querySelector('#reservation-dialog-title').textContent = item.guest_name || 'Reserva';
    elements.reservationDetail.innerHTML =
      detailField('Fecha y hora', reservationDateTime(item.starts_at), true) +
      detailField('Personas', item.party_size + ' personas') +
      detailField('Código', item.public_code) +
      detailField('Sección', sectionName(sectionId)) +
      detailField('Mesa', tableNames || 'Sin mesa asignada') +
      detailField('Correo', item.guest_email, true) +
      detailField('Teléfono', item.guest_phone || 'No indicado', true) +
      detailField('Solicitudes especiales', item.special_requests || 'Sin solicitudes especiales', true) +
      '<label class="detail-status is-wide"><span>Estado</span><select data-dialog-status="' + item.id + '">' + statuses + '</select></label>';
    const status = elements.reservationDetail.querySelector('[data-dialog-status]');
    status.addEventListener('change', async function () {
      status.disabled = true;
      try {
        await updateReservationStatus(item.id, status.value);
        elements.reservationDialog.close();
        await loadDashboard();
      } catch (error) {
        status.disabled = false;
        setStatus('No se pudo actualizar la reserva: ' + friendlyError(error), true);
      }
    });
    elements.reservationDialog.showModal();
  }
  function renderReservations() {
    const rows = filteredReservations();
    const target = document.querySelector('#reservation-list');
    target.innerHTML = rows.length ? rows.map(reservationMarkup).join('') :
      '<div class="empty-state"><strong>No hay reservas</strong><span>No existen resultados para esta fecha y búsqueda.</span></div>';
    bindReservationInteractions(target);
  }
  function renderSummary() {
    const target = document.querySelector('#summary-view');
    if (state.currentView === 'agenda') {
      target.innerHTML = state.reservations.length
        ? '<div class="reservation-list compact">' + state.reservations.map(reservationMarkup).join('') + '</div>'
        : '<div class="empty-state"><strong>Agenda libre</strong><span>No hay reservas para esta fecha.</span></div>';
      bindReservationInteractions(target);
      return;
    }
    const reservationIds = new Set(activeReservations().map(function (item) { return item.id; }));
    const occupiedIds = new Set(state.occupancies.filter(function (item) {
      return item.kind !== 'reservation' || reservationIds.has(item.reservation_id);
    }).map(function (item) { return item.table_id; }));
    const tables = state.tables.filter(function (table) { return table.active; }).map(function (table, index) {
      const occupied = occupiedIds.has(table.id);
      const left = Number(table.position_x == null ? 12 + (index % 4) * 22 : table.position_x);
      const top = Number(table.position_y == null ? 22 + Math.floor(index / 4) * 25 : table.position_y);
      return '<button style="left:' + left + '%;top:' + top + '%" class="floor-table' +
        (occupied ? ' is-reserved' : '') + '"><strong>' + escapeHtml(table.table_number) +
        '</strong><span>' + (occupied ? 'Ocupada' : table.max_capacity + ' sillas') + '</span></button>';
    }).join('');
    target.innerHTML = '<div class="floor-plan"><span class="plan-label">PLANO DE MESAS</span>' + tables + '</div>';
  }
  function renderSections() {
    const list = document.querySelector('#section-list');
    list.innerHTML = state.sections.length ? state.sections.map(function (section) {
      return '<article class="' + (section.active ? '' : 'is-muted') + '"><div><strong>' +
        escapeHtml(section.name) + '</strong><span>' + escapeHtml(section.description || 'Sin descripción') +
        '</span></div><button data-section-toggle="' + section.id + '">' +
        (section.active ? 'Archivar' : 'Activar') + '</button></article>';
    }).join('') : '<div class="empty-state small"><span>Crea tu primera sección.</span></div>';
    list.querySelectorAll('[data-section-toggle]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const item = state.sections.find(function (section) { return section.id === Number(button.dataset.sectionToggle); });
        await toggleRow('sections', item, 'sección');
      });
    });
    const select = document.querySelector('#table-form [name="section"]');
    select.innerHTML = state.sections.filter(function (section) { return section.active; }).map(function (section) {
      return '<option value="' + section.id + '">' + escapeHtml(section.name) + '</option>';
    }).join('');
  }
  function renderTables() {
    const target = document.querySelector('#table-list');
    target.innerHTML = state.tables.length ? state.tables.map(function (table) {
      return '<article class="' + (table.active ? '' : 'is-muted') + '"><span class="table-icon">' +
        escapeHtml(table.table_number) + '</span><div><strong>' + table.max_capacity +
        ' sillas</strong><small>' + escapeHtml(sectionName(table.section_id)) +
        '</small></div><button data-table-toggle="' + table.id + '">' +
        (table.active ? 'Archivar' : 'Activar') + '</button></article>';
    }).join('') : '<div class="empty-state small"><span>Crea tu primera mesa.</span></div>';
    target.querySelectorAll('[data-table-toggle]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const item = state.tables.find(function (table) { return table.id === Number(button.dataset.tableToggle); });
        await toggleRow('dining_tables', item, 'mesa');
      });
    });
  }
  function renderSchedules() {
    document.querySelector('#schedule-list').innerHTML = dayNames.map(function (day, weekday) {
      const rows = state.schedules.filter(function (item) { return item.weekday === weekday; });
      const activeRows = rows.filter(function (item) { return item.active; });
      const content = rows.length ? rows.map(function (row) {
        return '<article class="schedule-period' + (row.active ? '' : ' is-muted') + '"><div><b>' +
          escapeHtml(row.name) + '</b><span>' + escapeHtml(row.start_time.slice(0, 5)) + '–' +
          escapeHtml(row.end_time.slice(0, 5)) + '</span></div><div class="schedule-actions"><button data-schedule-toggle="' +
          row.id + '" type="button">' + (row.active ? 'Archivar' : 'Activar') + '</button><button data-schedule-delete="' +
          row.id + '" class="danger-action" type="button">Borrar</button></div></article>';
      }).join('') : '<p class="closed-day-message">Todavía no tiene horarios.</p>';
      const toggle = rows.length ? '<button data-day-active="' + weekday + '" data-next-active="' +
        (activeRows.length ? 'false' : 'true') + '" class="' + (activeRows.length ? 'close-day-action' : '') +
        '" type="button">' + (activeRows.length ? 'Marcar cerrado' : 'Abrir día') + '</button>' : '';
      return '<div class="schedule-day' + (activeRows.length ? '' : ' is-closed') + '"><div class="schedule-day-label"><strong>' +
        day + '</strong><span>' + (activeRows.length ? 'Abierto' : 'Cerrado') + '</span></div><div class="schedule-day-content"><div class="schedule-periods">' +
        content + '</div><div class="schedule-day-controls"><button data-schedule-add-day="' + weekday +
        '" type="button">＋ Agregar horario</button>' + toggle + '</div></div></div>';
    }).join('');
    document.querySelectorAll('[data-schedule-toggle]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const item = state.schedules.find(function (row) { return row.id === Number(button.dataset.scheduleToggle); });
        await toggleRow('service_periods', item, 'horario');
      });
    });
    document.querySelectorAll('[data-schedule-delete]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const item = state.schedules.find(function (row) { return row.id === Number(button.dataset.scheduleDelete); });
        if (!item) return;
        const confirmed = window.confirm('¿Borrar el horario "' + item.name + '" de ' + dayNames[item.weekday] + '? Esta acción no se puede deshacer.');
        if (!confirmed) return;
        button.disabled = true;
        try {
          const result = await client.from('service_periods').delete().eq('id', item.id).eq('restaurant_id', state.restaurant.id).select('id');
          if (result.error) throw result.error;
          if (!result.data || !result.data.length) throw new Error('El horario no se encontró o no tienes permiso para borrarlo.');
          setStatus('El horario se eliminó correctamente.');
          await loadDashboard();
        } catch (error) {
          button.disabled = false;
          setStatus('No se pudo borrar el horario: ' + friendlyError(error), true);
        }
      });
    });
    document.querySelectorAll('[data-schedule-add-day]').forEach(function (button) {
      button.addEventListener('click', function () {
        const form = document.querySelector('#schedule-form');
        form.elements.weekday.value = button.dataset.scheduleAddDay;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        form.elements.name.focus({ preventScroll: true });
        setStatus('Completa el nombre y las horas para abrir ' + dayNames[Number(button.dataset.scheduleAddDay)] + '.');
      });
    });
    document.querySelectorAll('[data-day-active]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const weekday = Number(button.dataset.dayActive);
        const nextActive = button.dataset.nextActive === 'true';
        if (!nextActive && !window.confirm('¿Marcar ' + dayNames[weekday] + ' como cerrado? Sus horarios se conservarán para poder reabrirlo después.')) return;
        button.disabled = true;
        try {
          const result = await client.from('service_periods').update({ active: nextActive })
            .eq('restaurant_id', state.restaurant.id).eq('weekday', weekday).select('id');
          if (result.error) throw result.error;
          if (!result.data || !result.data.length) throw new Error('No se encontraron horarios para actualizar.');
          setStatus(dayNames[weekday] + (nextActive ? ' volvió a estar abierto.' : ' se marcó como cerrado.'));
          await loadDashboard();
        } catch (error) {
          button.disabled = false;
          setStatus('No se pudo actualizar el día: ' + friendlyError(error), true);
        }
      });
    });
  }
  function renderSpecialDates() {
    const target = document.querySelector('#special-date-list');
    if (!state.specialDates.length) {
      target.innerHTML = '<div class="special-date-empty"><strong>No hay cierres especiales próximos</strong><span>Los cierres semanales se siguen administrando arriba.</span></div>';
      return;
    }
    target.innerHTML = state.specialDates.map(function (item) {
      const parts = item.service_date.split('-').map(Number);
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      const day = new Intl.DateTimeFormat('es-MX', { day: '2-digit', timeZone: 'UTC' }).format(date);
      const month = new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
      const message = item.customer_message && item.customer_message !== item.name
        ? '<span>' + escapeHtml(item.customer_message) + '</span>' : '<span>Cierre de día completo</span>';
      return '<article><time datetime="' + escapeHtml(item.service_date) + '"><strong>' + day + '</strong><span>' +
        escapeHtml(month) + '</span></time><div><strong>' + escapeHtml(item.name) + '</strong>' + message +
        '</div><span class="special-date-status">Cerrado</span><button data-special-date-delete="' + item.id +
        '" type="button">Eliminar</button></article>';
    }).join('');
    target.querySelectorAll('[data-special-date-delete]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const item = state.specialDates.find(function (date) { return date.id === Number(button.dataset.specialDateDelete); });
        if (!item || !window.confirm('¿Eliminar el cierre especial de "' + item.name + '"? La fecha volverá a usar su horario semanal.')) return;
        button.disabled = true;
        try {
          const result = await client.from('special_dates').delete().eq('id', item.id)
            .eq('restaurant_id', state.restaurant.id).select('id');
          if (result.error) throw result.error;
          if (!result.data || !result.data.length) throw new Error('La fecha especial no se encontró o no tienes permiso para eliminarla.');
          setStatus('El cierre especial se eliminó correctamente.');
          await loadDashboard();
        } catch (error) {
          button.disabled = false;
          setStatus('No se pudo eliminar el cierre especial: ' + friendlyError(error), true);
        }
      });
    });
  }
  function renderSettings() {
    if (!state.settings) return;
    const form = document.querySelector('#settings-form');
    form.elements.interval.value = state.settings.slot_interval_minutes;
    form.elements.duration.value = state.settings.default_duration_minutes;
    form.elements.party.value = state.settings.maximum_party_size;
    form.elements.advance.value = state.settings.minimum_advance_minutes;
  }

  async function toggleRow(table, item, label) {
    try {
      const result = await client.from(table).update({ active: !item.active }).eq('id', item.id).eq('restaurant_id', state.restaurant.id).select('id');
      if (result.error) throw result.error;
      if (!result.data || !result.data.length) throw new Error('El registro no se encontró o no tienes permiso para modificarlo.');
      setStatus('La ' + label + ' se actualizó correctamente.');
      await loadDashboard();
    } catch (error) {
      setStatus('No se pudo actualizar la ' + label + ': ' + friendlyError(error), true);
    }
  }
  async function addSection(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const result = await client.from('sections').insert({
        restaurant_id: state.restaurant.id,
        name: String(values.get('name') || '').trim(),
        description: String(values.get('description') || '').trim() || null,
        display_order: state.sections.length
      });
      if (result.error) throw result.error;
      form.reset();
      await loadDashboard();
    } catch (error) { setStatus('No se pudo guardar la sección: ' + friendlyError(error), true); }
  }
  async function addTable(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const result = await client.from('dining_tables').insert({
        restaurant_id: state.restaurant.id,
        section_id: Number(values.get('section')),
        table_number: String(values.get('number') || '').trim(),
        min_capacity: 1,
        max_capacity: Number(values.get('capacity')),
        shape: 'round',
        position_x: 12 + (state.tables.length % 4) * 22,
        position_y: 22 + Math.floor(state.tables.length / 4) * 25
      });
      if (result.error) throw result.error;
      form.reset();
      form.elements.capacity.value = 4;
      await loadDashboard();
    } catch (error) { setStatus('No se pudo guardar la mesa: ' + friendlyError(error), true); }
  }
  async function addSchedule(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const start = String(values.get('start'));
    const end = String(values.get('end'));
    if (end <= start) {
      setStatus('La hora de cierre debe ser posterior a la hora de apertura.', true);
      return;
    }
    try {
      const result = await client.from('service_periods').insert({
        restaurant_id: state.restaurant.id, weekday: Number(values.get('weekday')),
        name: String(values.get('name') || '').trim(), start_time: start, end_time: end
      });
      if (result.error) throw result.error;
      form.reset();
      form.elements.start.value = '13:00';
      form.elements.end.value = '22:00';
      await loadDashboard();
    } catch (error) { setStatus('No se pudo guardar el horario: ' + friendlyError(error), true); }
  }
  async function addSpecialDate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const selected = String(values.get('celebration') || '');
    const custom = String(values.get('custom') || '').trim();
    const name = selected === '__custom__' ? custom : selected;
    if (!name) {
      setStatus('Selecciona una celebración o escribe un motivo personalizado.', true);
      return;
    }
    try {
      const result = await client.from('special_dates').upsert({
        restaurant_id: state.restaurant.id,
        service_date: String(values.get('date')),
        name: name,
        closed: true,
        customer_message: String(values.get('message') || '').trim() || name
      }, { onConflict: 'restaurant_id,service_date' }).select('id');
      if (result.error) throw result.error;
      if (!result.data || !result.data.length) throw new Error('No fue posible confirmar la fecha especial.');
      form.reset();
      form.elements.date.min = localDate();
      form.elements.date.value = localDate();
      document.querySelector('#special-custom-field').classList.add('is-hidden');
      form.elements.custom.required = false;
      setStatus('La fecha especial quedó cerrada y ya se muestra en el calendario público.');
      await loadDashboard();
    } catch (error) { setStatus('No se pudo guardar el cierre especial: ' + friendlyError(error), true); }
  }
  async function saveSettings(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      const result = await client.from('reservation_settings').upsert({
        restaurant_id: state.restaurant.id,
        slot_interval_minutes: Number(values.get('interval')),
        default_duration_minutes: Number(values.get('duration')),
        maximum_party_size: Number(values.get('party')),
        minimum_advance_minutes: Number(values.get('advance'))
      }, { onConflict: 'restaurant_id' });
      if (result.error) throw result.error;
      await loadDashboard();
    } catch (error) { setStatus('No se pudieron guardar los ajustes: ' + friendlyError(error), true); }
  }

  function bindNavigation() {
    document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Cancun', weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date());
    elements.reservationDate.value = localDate();
    document.querySelector('#admin-nav').addEventListener('click', function (event) {
      const button = event.target.closest('[data-tab]');
      if (!button) return;
      document.querySelectorAll('#admin-nav button').forEach(function (item) { item.classList.toggle('is-active', item === button); });
      document.querySelectorAll('.admin-tab').forEach(function (item) {
        item.classList.toggle('is-active', item.id === 'tab-' + button.dataset.tab);
      });
      if (button.dataset.tab !== 'reservas') setCalendarOpen(false);
    });
    document.querySelectorAll('[data-view]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.currentView = button.dataset.view;
        document.querySelectorAll('[data-view]').forEach(function (item) { item.classList.toggle('is-active', item === button); });
        renderSummary();
      });
    });
    document.querySelector('#focus-search').addEventListener('click', function () {
      document.querySelector('[data-tab="reservas"]').click();
      elements.reservationSearch.focus();
    });
    elements.reservationSearch.addEventListener('input', renderReservations);
    elements.reservationDate.addEventListener('change', loadDashboard);
    elements.reservationDateTrigger.addEventListener('click', async function () {
      const willOpen = elements.reservationCalendar.hidden;
      setCalendarOpen(willOpen);
      if (!willOpen) return;
      const selectedMonth = (elements.reservationDate.value || localDate()).slice(0, 7);
      if (state.calendarMonth !== selectedMonth) await loadCalendarMonth(selectedMonth);
      else renderCalendar();
    });
    document.querySelector('#calendar-previous').addEventListener('click', function () {
      loadCalendarMonth(shiftMonth(state.calendarMonth, -1));
    });
    document.querySelector('#calendar-next').addEventListener('click', function () {
      loadCalendarMonth(shiftMonth(state.calendarMonth, 1));
    });
    elements.reservationCalendarGrid.addEventListener('click', async function (event) {
      const button = event.target.closest('[data-calendar-date]');
      if (!button) return;
      elements.reservationDate.value = button.dataset.calendarDate;
      renderCalendar();
      setCalendarOpen(false);
      await loadDashboard();
    });
    document.addEventListener('click', function (event) {
      if (!event.target.closest('.reservation-date-picker')) setCalendarOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !elements.reservationCalendar.hidden) {
        setCalendarOpen(false);
        elements.reservationDateTrigger.focus();
      }
    });
    document.querySelector('#section-form').addEventListener('submit', addSection);
    document.querySelector('#table-form').addEventListener('submit', addTable);
    document.querySelector('#schedule-form').addEventListener('submit', addSchedule);
    const specialDateForm = document.querySelector('#special-date-form');
    specialDateForm.elements.date.min = localDate();
    specialDateForm.elements.date.value = localDate();
    specialDateForm.addEventListener('submit', addSpecialDate);
    specialDateForm.elements.celebration.addEventListener('change', function () {
      const custom = this.value === '__custom__';
      document.querySelector('#special-custom-field').classList.toggle('is-hidden', !custom);
      specialDateForm.elements.custom.required = custom;
      if (custom) specialDateForm.elements.custom.focus();
    });
    document.querySelector('#settings-form').addEventListener('submit', saveSettings);
    document.querySelector('#logout-button').addEventListener('click', signOut);
    document.querySelector('#reservation-dialog-close').addEventListener('click', function () { elements.reservationDialog.close(); });
    elements.reservationDialog.addEventListener('click', function (event) {
      if (event.target === elements.reservationDialog) elements.reservationDialog.close();
    });
  }

  async function initialize() {
    bindNavigation();
    elements.authForm.addEventListener('submit', submitAuth);
    if (!api || !api.configured || !client) {
      showOnly(elements.configCard);
      return;
    }
    const result = await client.auth.getSession();
    if (result.error) {
      showOnly(elements.authCard);
      setMessage(elements.authMessage, friendlyError(result.error), true);
      return;
    }
    await handleSession(result.data.session);
    client.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_OUT') {
        state.session = null;
        state.restaurant = null;
        showOnly(elements.authCard);
      } else if (event === 'SIGNED_IN' && session && (!state.session || state.session.user.id !== session.user.id)) {
        setTimeout(function () { handleSession(session); }, 0);
      }
    });
  }

  initialize();
})();
