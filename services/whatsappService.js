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
    // Si Twilio no está configurado, salir silenciosamente
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

    // Eliminar espacios y caracteres especiales
    let cleaned = phone.replace(/\D/g, "");
    console.log(`📱 Número limpiado: ${cleaned}`);

    // CORRECCIÓN: Para números móviles en México debe ser +521 no +52
    if (cleaned.length === 12 && cleaned.startsWith("52")) {
      // Convertir +52332... a +521332... (móvil México)
      // Los números mexicanos móviles son de 10 dígitos que empiezan con 1, 2, 3, etc.
      const remainingDigits = cleaned.substring(2); // Quita el 52
      if (remainingDigits.length === 10) {
        cleaned = `+521${remainingDigits}`;
      } else {
        cleaned = `+${cleaned}`;
      }
    } else if (cleaned.length === 10) {
      // Número mexicano de 10 dígitos sin código
      cleaned = `+521${cleaned}`;
    } else {
      // Intentar formatear como está
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

    let message = `🎉 *Confirmación de Compra - Ticketmaster* 🎉\n\n`;
    message += `*Evento:* ${eventData?.nombre_evento || "Evento"}\n`;

    // Formatear fecha
    if (eventData?.fecha || eventData?.date) {
      const fechaRaw = eventData.fecha || eventData.date;
      message += `*Fecha:* ${this.formatDateForWhatsApp(fechaRaw)}\n`;
    }

    if (eventData?.lugar || eventData?.ubicacion || eventData?.location) {
      message += `*Lugar:* ${
        eventData.lugar || eventData.ubicacion || eventData.location
      }\n`;
    }

    message += `\n*Detalles de Boletos:*\n`;

    let totalTickets = 0;
    ticketTypes.forEach((ticket) => {
      message += `• ${ticket.quantity} x ${ticket.name} - $${(
        ticket.price * ticket.quantity
      ).toFixed(2)}\n`;
      totalTickets += ticket.quantity;
    });

    if (!isMuseum && selectedSeats && selectedSeats.length > 0) {
      message += `\n*Asientos seleccionados:* ${selectedSeats.length}\n`;
    } else if (isMuseum) {
      message += `\n*Tipo de entrada:* Acceso general al museo\n`;
    }

    message += `\n*Resumen de pago:*\n`;
    message += `Total de boletos: ${totalTickets}\n`;
    message += `*Total pagado:* $${total.toFixed(2)}\n`;
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
    }

    message += `\n¡Gracias por confiar en Eventify! 🎊\n`;
    message += `Para ayuda: ${process.env.SUPPORT_PHONE || "+52 55 1234 5678"}`;

    return message;
  }

  formatDateForWhatsApp(dateString) {
    if (!dateString) return "Fecha no especificada";

    console.log(`📅 Formateando fecha: ${dateString}`);

    // Si ya está en un formato legible como "lunes, 1 de diciembre de 2025"
    if (typeof dateString === "string" && dateString.includes("de")) {
      // Extraer día, mes y año del string
      const parts = dateString.split(" ");
      if (parts.length >= 5) {
        const dia = parts[1]; // "1"
        const mes = parts[3]; // "diciembre"
        const año = parts[5]; // "2025"

        // Mapear nombres de meses a números
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

        // Formatear como DD/MM/AAAA
        return `${dia.padStart(2, "0")}/${mesNumero}/${año}`;
      }
    }

    // Intentar con Date para otros formatos
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

    // Si todo falla, devolver el string original
    return dateString;
  }
}
module.exports = new WhatsAppService();
