const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 🔍 Verificar configuración al iniciar el servidor
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Error configurando Nodemalier:", error);
  } else {
    console.log("✅ Servidor de correo listo para enviar emails");
  }
});

async function enviarCorreo(destinatarios, asunto, html) {
  try {
    console.log("📨 Intentando enviar correo a:", destinatarios);

    await transporter.sendMail({
      from: `"Escuela de Fútbol" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(destinatarios) ? destinatarios.join(",") : destinatarios,
      subject: asunto,
      html
    });

    console.log("📧 Correo ENVIADO a:", destinatarios);
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
  }
}

module.exports = { enviarCorreo };
