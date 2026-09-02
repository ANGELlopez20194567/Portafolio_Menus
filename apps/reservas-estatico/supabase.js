(function () {
  const config = window.SUPABASE_CONFIG || {};
  const configured = Boolean(config.url && config.publishableKey && window.supabase);
  const client = configured ? window.supabase.createClient(config.url, config.publishableKey) : null;

  async function getBookingConfig(restaurantId) {
    if (!client || !restaurantId) return null;
    const [{ data, error }, bookingWindow] = await Promise.all([
      client.rpc('get_restaurant_booking_config', {
      p_restaurant_public_id: restaurantId
      }),
      client.rpc('get_restaurant_booking_window', { p_restaurant_public_id: restaurantId })
    ]);
    if (error) throw error;
    if (bookingWindow.error) throw bookingWindow.error;
    if (!data) return null;
    return {
      ...data,
      maximum_advance_days: bookingWindow.data,
      sections: (data.sections || []).map((section) => ({
        publicId: section.id,
        name: section.name,
        description: section.description
      }))
    };
  }

  async function getSlots({ restaurantId, date, partySize, sectionId }) {
    if (!client) return [];
    const { data, error } = await client.rpc('get_available_reservation_slots', {
      p_restaurant_public_id: restaurantId,
      p_service_date: date,
      p_party_size: partySize,
      p_section_public_id: sectionId || undefined
    });
    if (error) throw error;
    return data || [];
  }

  async function createReservation(values) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { data, error } = await client.rpc('create_reservation', {
      p_restaurant_public_id: values.restaurantId,
      p_starts_at: values.startsAt,
      p_party_size: values.partySize,
      p_guest_name: values.name,
      p_guest_email: values.email,
      p_privacy_notice_version: '2026-08-25',
      p_privacy_consent: true,
      p_guest_phone: values.phone || undefined,
      p_section_public_id: values.sectionId || undefined,
      p_special_requests: values.notes || undefined,
      p_confirm_immediately: true
    });
    if (error) throw error;
    if (data && data.status === 'confirmed' && data.reservation_code) {
      const delivery = await client.functions.invoke('send-reservation-confirmation', {
        body: { reservationCode: data.reservation_code }
      });
      return {
        ...data,
        email_delivery_status: delivery.error ? 'queued' : (delivery.data?.status || 'queued')
      };
    }
    return data;
  }

  async function getReceipt(code) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { data, error } = await client.rpc('get_reservation_receipt', {
      p_reservation_code: code.trim().toUpperCase()
    });
    if (error) throw error;
    return data;
  }

  async function cancelReservation(code) {
    if (!client) throw new Error('Supabase no está configurado.');
    const { data, error } = await client.rpc('cancel_reservation', {
      p_reservation_code: code.trim().toUpperCase()
    });
    if (error) throw error;
    return data;
  }

  async function testAdminConnection() {
    if (!client) return { connected: false, protected: false };
    const { data, error } = await client.from('restaurants').select('id').limit(1);
    if (error) return { connected: true, protected: true, message: error.message };
    return { connected: true, protected: !data.length };
  }

  window.MesaSupabase = {
    client,
    config,
    configured,
    getBookingConfig,
    getSlots,
    createReservation,
    getReceipt,
    cancelReservation,
    testAdminConnection
  };
})();
