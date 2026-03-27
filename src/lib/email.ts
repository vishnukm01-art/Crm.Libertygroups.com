import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP not configured, skipping email:", options.subject);
    return;
  }

  await transporter.sendMail({
    from: `"Liberty Markets CRM" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export function emailMT5AccountCreated(
  name: string,
  email: string,
  mt5Login: string,
  password: string,
  group: string,
  leverage: string
): EmailOptions {
  return {
    to: email,
    subject: "Your MT5 Trading Account Has Been Created",
    html: `
      <h2>Welcome to Liberty Markets, ${name}!</h2>
      <p>Your MT5 trading account has been created successfully.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;font-weight:bold;">MT5 Login:</td><td style="padding:8px;">${mt5Login}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Password:</td><td style="padding:8px;">${password}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Group:</td><td style="padding:8px;">${group}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Leverage:</td><td style="padding:8px;">${leverage}</td></tr>
      </table>
      <p>You can start trading by downloading the MT5 platform.</p>
      <p>Best regards,<br>Liberty Markets Team</p>
    `,
  };
}

export function emailDepositConfirmation(
  name: string,
  email: string,
  amount: number,
  currency: string
): EmailOptions {
  return {
    to: email,
    subject: "Deposit Confirmation - Liberty Markets",
    html: `
      <h2>Deposit Confirmed</h2>
      <p>Dear ${name},</p>
      <p>Your deposit of <strong>${currency} ${amount.toFixed(2)}</strong> has been processed and credited to your MT5 account.</p>
      <p>Best regards,<br>Liberty Markets Team</p>
    `,
  };
}

export function emailWithdrawalProcessed(
  name: string,
  email: string,
  amount: number,
  currency: string
): EmailOptions {
  return {
    to: email,
    subject: "Withdrawal Processed - Liberty Markets",
    html: `
      <h2>Withdrawal Processed</h2>
      <p>Dear ${name},</p>
      <p>Your withdrawal of <strong>${currency} ${amount.toFixed(2)}</strong> has been processed from your MT5 account.</p>
      <p>Please allow 1-3 business days for the funds to appear in your bank account.</p>
      <p>Best regards,<br>Liberty Markets Team</p>
    `,
  };
}
