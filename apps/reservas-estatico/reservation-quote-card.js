const card = document.createElement('quote-card');

const content = {
  label: 'RESERVATION SYSTEM',
  title: 'Reservas simples para tus clientes y tu equipo',
  description: 'Un sistema completo para recibir reservaciones en línea, organizar la disponibilidad y administrar cada visita desde un solo lugar.',
  includes: 'Calendario de disponibilidad,Selección de horario y comensales,Formulario y confirmación,Consulta de reservaciones,Panel administrativo,Gestión de mesas y horarios',
  'ideal-for': 'Restaurantes, cafeterías y conceptos gastronómicos que quieren reducir llamadas, ordenar su operación y ofrecer reservas disponibles las 24 horas.',
  cta: 'Cotizar sistema',
  href: 'mailto:hola@ejemplo.com?subject=Cotización%20Reservation%20System'
};

Object.entries(content).forEach(([name, value]) => card.setAttribute(name, value));
document.body.append(card);
