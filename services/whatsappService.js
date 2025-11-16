const twilio = require("twilio");

class WhatsAppService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendPurchaseConfirmation(userPhone, purchaseData) {
    try {
      const message = this.formatPurchaseMessage(purchaseData);

      const result = await this.client.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${userPhone}`,
      });

      console.log("WhatsApp message sent:", result.sid);
      return result;
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      throw error;
    }
  }

  formatPurchaseMessage(purchaseData) {
    const {
      eventData,
      ticketTypes,
      total,
      selectedSeats,
      transactionId,
      isMuseum,
    } = purchaseData;

    let message = `🎉 *Confirmación de Compra* 🎉\n\n`;
    message += `*Evento:* ${eventData.title || eventData.lugar}\n`;
    message += `*Fecha:* ${eventData.date || eventData.fecha}\n`;
    message += `*Lugar:* ${eventData.location || eventData.ubicacion}\n\n`;

    message += `*Detalles de Boletos:*\n`;
    ticketTypes
      .filter((t) => t.quantity > 0)
      .forEach((ticket, index) => {
        message += `• ${ticket.quantity} x ${ticket.name} - $${
          ticket.price * ticket.quantity
        }\n`;
      });

    if (!isMuseum && selectedSeats && selectedSeats.length > 0) {
      message += `\n*Asientos:* ${selectedSeats.join(", ")}\n`;
    }

    message += `\n*Total Pagado:* $${total.toFixed(2)}\n`;
    message += `*ID de Transacción:* ${transactionId}\n\n`;
    message += `¡Gracias por tu compra! Presenta este mensaje en la entrada.\n`;
    message += `📞 Para ayuda: +1-800-123-4567`;

    return message;
  }

  // Método para formatear números de teléfono
  formatPhoneNumber(phone) {
    // Eliminar espacios y caracteres especiales
    let cleaned = phone.replace(/\D/g, "");

    // Si no tiene código de país, agregar +1 (o ajustar según tu país)
    if (!cleaned.startsWith("+")) {
      // Asumir que es México (+52) - ajusta según tu necesidad
      cleaned = `+52${cleaned}`;
    }

    return cleaned;
  }
}

module.exports = new WhatsAppService();
