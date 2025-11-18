const twilio = require("twilio");

class WhatsAppService {
  constructor() {
    try {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log("✅ WhatsAppService initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing WhatsAppService:", error);
      this.client = null;
    }
  }

  async sendPurchaseConfirmation(userPhone, purchaseData) {
    if (!this.client) {
      console.log("📱 WhatsAppService not configured, skipping message");
      return { success: false, error: "Service not configured" };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(userPhone);
      const message = this.formatPurchaseMessage(purchaseData);

      console.log(`📤 Attempting to send WhatsApp to: ${formattedPhone}`);

      const result = await this.client.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${formattedPhone}`,
      });

      console.log("✅ WhatsApp message sent successfully:", result.sid);
      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      console.error("❌ Error sending WhatsApp message:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  formatPhoneNumber(phone) {
    if (!phone) {
      throw new Error("Phone number is required");
    }

    console.log(`📱 Número recibido para formatear: ${phone}`);

    let cleaned = phone.replace(/\D/g, "");
    console.log(`📱 Número limpiado: ${cleaned}`);

    if (cleaned.length === 12 && cleaned.startsWith("52")) {
      const remainingDigits = cleaned.substring(2);
      if (remainingDigits.length === 10) {
        cleaned = `+521${remainingDigits}`;
      } else {
        cleaned = `+${cleaned}`;
      }
    } else if (cleaned.length === 10) {
      cleaned = `+521${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }

    console.log(`📱 Número formateado: ${cleaned}`);
    return cleaned;
  }

  formatPurchaseMessage(purchaseData) {
    const {
      eventData,
      ticketTypes,
      total,
      selectedSeats,
      transactionId,
      isMuseum,
      paymentMethod,
    } = purchaseData;

    let message = `🎉 *Confirmación de Compra - Eventify* 🎉\n\n`;
    message += `*Evento:* ${eventData?.nombre_evento || "Evento"}\n`;

    // Formatear fecha
    if (eventData?.fecha || eventData?.date) {
      const fechaRaw = eventData.fecha || eventData.date;
      message += `*Fecha:* ${this.formatDateForWhatsApp(fechaRaw)}\n`;
    }

    if (eventData?.time) {
      message += `*Horario:* ${eventData.time}\n`;
    }

    if (eventData?.lugar || eventData?.ubicacion || eventData?.location) {
      message += `*Lugar:* ${
        eventData.lugar || eventData.ubicacion || eventData.location
      }\n`;
    }

    message += `\n*Detalles de Boletos:*\n`;

    let totalTickets = 0;

    if (purchaseData.ticket_details && purchaseData.ticket_details.length > 0) {
      console.log("🔍 Procesando ticket_details:", purchaseData.ticket_details);

      purchaseData.ticket_details.forEach((ticket) => {
        console.log(`🔍 Ticket individual:`, ticket);
        const ticketName = this.getTicketTypeName(ticket.categoria_boleto_id);
        console.log(`🔍 Nombre de ticket obtenido: ${ticketName}`);

        message += `• ${
          ticket.cantidad
        } x ${ticketName} - $${ticket.subtotal.toFixed(2)}\n`;
        totalTickets += ticket.cantidad;
      });
    } else {
      // Fallback a ticketTypes si no hay ticket_details
      console.log("🔍 Usando fallback ticketTypes:", ticketTypes);
      ticketTypes.forEach((ticket) => {
        message += `• ${ticket.quantity} x ${ticket.name} - $${(
          ticket.price * ticket.quantity
        ).toFixed(2)}\n`;
        totalTickets += ticket.quantity;
      });
    }

    // MEJORA: Mostrar asientos agrupados por sección
    if (!isMuseum && selectedSeats && selectedSeats.length > 0) {
      message += `\n*Asientos seleccionados:*\n`;
      const groupedSeats = this.groupSeatsBySection(selectedSeats);
      message += `${groupedSeats}\n`;
    } else if (isMuseum) {
      message += `\n*Tipo de entrada:* Acceso general al museo\n`;
    }

    message += `\n*Resumen de pago:*\n`;
    message += `Total de boletos: ${totalTickets}\n`;
    message += `*Total pagado:* $${total.toFixed(2)} MXN\n`;
    message += `*Método de pago:* ${
      paymentMethod === "paypal" ? "PayPal" : "Tarjeta"
    }\n`;
    message += `*ID de transacción:* ${transactionId}\n\n`;

    message += `📋 *Instrucciones:*\n`;
    if (isMuseum) {
      message += `• Presenta este mensaje en la entrada del museo\n`;
      message += `• Horario: ${
        eventData?.hora_apertura || eventData?.time || "9:00 AM"
      } - ${eventData?.hora_cierre || "6:00 PM"}\n`;
    } else {
      message += `• Presenta este mensaje en la taquilla\n`;
      message += `• Llega 30 minutos antes del evento\n`;
      message += `• Tus asientos están reservados con este ID\n`;
    }

    message += `\n¡Gracias por confiar en Eventify! 🎊\n`;
    message += `Para ayuda: ${process.env.SUPPORT_PHONE || "+52 55 1234 5678"}`;

    return message;
  }

  // NUEVO MÉTODO: Agrupar asientos por sección
  groupSeatsBySection(selectedSeats) {
    if (!selectedSeats || selectedSeats.length === 0) {
      return "No se seleccionaron asientos";
    }

    try {
      // Agrupar asientos por sección
      const seatsBySection = {};

      selectedSeats.forEach((seat) => {
        let sectionKey, row, col;

        // Procesar según el formato del asiento
        if (typeof seat === "object" && seat.seccion !== undefined) {
          sectionKey = seat.seccion;
          row = parseInt(seat.fila);
          col = parseInt(seat.columna);
        } else if (typeof seat === "string" && seat.includes("-")) {
          const parts = seat.split("-");
          sectionKey = parts[0];
          row = parseInt(parts[1]);
          col = parseInt(parts[2]);
        } else {
          return; // Saltar asientos con formato desconocido
        }

        const sectionName = this.getSectionDisplayName(sectionKey);
        const rowLetter = String.fromCharCode(65 + row - 1);
        const seatNumber = col;
        const seatDisplay = `${rowLetter}${seatNumber}`;

        if (!seatsBySection[sectionName]) {
          seatsBySection[sectionName] = [];
        }
        seatsBySection[sectionName].push(seatDisplay);
      });

      // Crear string agrupado
      const groupedStrings = [];
      for (const [sectionName, seats] of Object.entries(seatsBySection)) {
        groupedStrings.push(`${sectionName} ${seats.join(", ")}`);
      }

      return groupedStrings.join("\n");
    } catch (error) {
      console.error("❌ Error agrupando asientos:", error);
      return this.formatSeatsForMessage(selectedSeats); // Fallback al método anterior
    }
  }

  // MÉTODO: Obtener nombre de categoría de boleto
  getTicketTypeName(categoriaId) {
    console.log(
      `🔍 Buscando nombre para categoriaId:`,
      categoriaId,
      `Tipo:`,
      typeof categoriaId
    );

    const ticketTypes = {
      1: "General",
      2: "Balcón",
      3: "Palco",
      4: "Platea",
      10: "Tradicional",
      11: "Plus",
      12: "VIP",
      13: "MACRO XE",
      14: "Junior",
      15: "4DX",
      16: "IMAX",
      17: "VR",
      18: "Screen X",
      19: "General",
    };

    // Convertir a número si es string
    const id =
      typeof categoriaId === "string" ? parseInt(categoriaId) : categoriaId;

    const result = ticketTypes[id] || `Categoría ${categoriaId}`;
    console.log(`🔍 Resultado: ${result}`);

    return result;
  }

  // MÉTODO: Obtener nombre display de la sección (MEJORADO)
  getSectionDisplayName(sectionKey) {
    const sectionNames = {
      // Cine
      tradicional: "Tradicional",
      premium: "Premium",
      vip: "VIP",
      imax: "IMAX",
      "4dx": "4DX",
      macroxe: "MACRO XE",
      sala_oro: "Sala Oro",
      sala_platino: "Sala Platino",

      // Teatro
      general: "General",
      platea: "Platea",
      palco: "Palco",
      balcon: "Balcón",
      balconIzquierdo: "Balcón Izquierdo",
      balconDerecho: "Balcón Derecho",
      balcon_izquierdo: "Balcón Izquierdo",
      balcon_derecho: "Balcón Derecho",
      palco_alto: "Palco Alto",
      palco_bajo: "Palco Bajo",

      // Museos y otros
      entrada_general: "Entrada General",
      acceso_preferente: "Acceso Preferente",
      visita_guiada: "Visita Guiada",
    };

    return sectionNames[sectionKey] || this.capitalizeFirstLetter(sectionKey);
  }

  // Helper para capitalizar palabras
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Método anterior mantenido por compatibilidad
  formatSeatsForMessage(selectedSeats) {
    if (!selectedSeats || selectedSeats.length === 0) {
      return "No se seleccionaron asientos";
    }

    try {
      const formattedSeats = selectedSeats.map((seat) => {
        if (
          typeof seat === "object" &&
          seat.seccion !== undefined &&
          seat.fila !== undefined &&
          seat.columna !== undefined
        ) {
          const sectionName = this.getSectionDisplayName(seat.seccion);
          const rowLetter = String.fromCharCode(65 + parseInt(seat.fila) - 1);
          const seatNumber = parseInt(seat.columna);
          return `${sectionName} ${rowLetter}${seatNumber}`;
        }

        if (typeof seat === "string" && seat.includes("-")) {
          const parts = seat.split("-");
          if (parts.length >= 3) {
            const section = parts[0];
            const row = parseInt(parts[1]);
            const col = parseInt(parts[2]);
            const sectionName = this.getSectionDisplayName(section);
            const rowLetter = String.fromCharCode(65 + row - 1);
            const seatNumber = col;
            return `${sectionName} ${rowLetter}${seatNumber}`;
          }
        }

        return seat;
      });

      return formattedSeats.join(", ");
    } catch (error) {
      console.error("❌ Error formateando asientos:", error);
      return selectedSeats.join(", ");
    }
  }

  formatDateForWhatsApp(dateString) {
    if (!dateString) return "Fecha no especificada";

    console.log(`📅 Formateando fecha: ${dateString}`);

    if (typeof dateString === "string" && dateString.includes("de")) {
      const parts = dateString.split(" ");
      if (parts.length >= 5) {
        const dia = parts[1];
        const mes = parts[3];
        const año = parts[5];

        const meses = {
          enero: "01",
          febrero: "02",
          marzo: "03",
          abril: "04",
          mayo: "05",
          junio: "06",
          julio: "07",
          agosto: "08",
          septiembre: "09",
          octubre: "10",
          noviembre: "11",
          diciembre: "12",
        };

        const mesNumero = meses[mes.toLowerCase()] || "01";
        return `${dia.padStart(2, "0")}/${mesNumero}/${año}`;
      }
    }

    try {
      const fecha = new Date(dateString);
      if (!isNaN(fecha.getTime())) {
        return fecha.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch (error) {
      console.log("❌ Error formateando fecha:", error);
    }

    return dateString;
  }
}

module.exports = new WhatsAppService();
