import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    throw new Error(
      "Missing SMTP configuration. Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM",
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid positive number");
  }

  const secure =
    typeof process.env.SMTP_SECURE === "string"
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

  return { host, port, user, pass, from, secure };
}

export async function sendReservationOtpEmail(
  to: string,
  code: string,
  reservation: {
    stationName: string;
    date: string;
    slotLabel: string;
  },
) {
  const smtp = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const subject = "Your reservation OTP code";
  const text = [
    "Use the OTP below to confirm your reservation:",
    "",
    `OTP: ${code}`,
    `Station: ${reservation.stationName}`,
    `Date: ${reservation.date}`,
    `Slot: ${reservation.slotLabel}`,
    "",
    "This code expires in 10 minutes.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Reservation Confirmation</h2>
      <p style="margin-top: 0; color: #475569;">Use this OTP to complete your booking:</p>
      <div style="font-size: 28px; letter-spacing: 6px; font-weight: 700; padding: 14px 18px; background: #e0f2fe; border-radius: 10px; display: inline-block; color: #0c4a6e;">
        ${code}
      </div>
      <div style="margin-top: 18px; font-size: 14px; color: #334155;">
        <p style="margin: 6px 0;"><strong>Station:</strong> ${reservation.stationName}</p>
        <p style="margin: 6px 0;"><strong>Date:</strong> ${reservation.date}</p>
        <p style="margin: 6px 0;"><strong>Slot:</strong> ${reservation.slotLabel}</p>
      </div>
      <p style="margin-top: 14px; font-size: 12px; color: #64748b;">This code expires in 10 minutes.</p>
    </div>
  `;

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject,
    text,
    html,
  });
}
