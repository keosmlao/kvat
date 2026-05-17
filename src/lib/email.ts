import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { renderInvoicePdf } from "./pdf";
import { renderQuotationPdf } from "./quotation-pdf";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  fromName: string | null;
  fromEmail: string;
  secure: boolean;
};

export type SendResult = { ok: true } | { ok: false; error: string };

async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  const s = await prisma.setting.findUnique({ where: { id: "default" } });
  if (!s?.smtpHost || !s.smtpUser || !s.smtpPassword || !s.smtpFromEmail) {
    return null;
  }
  return {
    host: s.smtpHost,
    port: s.smtpPort ?? 587,
    user: s.smtpUser,
    password: s.smtpPassword,
    fromName: s.smtpFromName,
    fromEmail: s.smtpFromEmail,
    secure: s.smtpSecure,
  };
}

/**
 * Low-level send. Caller passes already-rendered subject/body/attachments.
 * Always writes an EmailLog row (SENT or FAILED). Returns ok/error so the
 * caller can show a toast.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer }[];
  kind: string;                     // "invoice" | "reminder" | "quotation" | "statement" | "test"
  recordType?: string | null;
  recordId?: string | null;
  userId?: string | null;
}): Promise<SendResult> {
  const cfg = await loadSmtpConfig();
  if (!cfg) {
    await prisma.emailLog.create({
      data: {
        toEmail: args.to,
        subject: args.subject,
        kind: args.kind,
        recordType: args.recordType ?? null,
        recordId: args.recordId ?? null,
        status: "FAILED",
        errorMsg: "SMTP ບໍ່ໄດ້ກຳນົດຄ່າ (Settings → Email)",
        sentByUserId: args.userId ?? null,
      },
    });
    return { ok: false, error: "SMTP ບໍ່ໄດ້ກຳນົດຄ່າ — ໄປ Settings → Email" };
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password },
  });

  const from = cfg.fromName
    ? `"${cfg.fromName}" <${cfg.fromEmail}>`
    : cfg.fromEmail;

  try {
    await transporter.sendMail({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text ?? args.html.replace(/<[^>]+>/g, ""),
      attachments: args.attachments,
    });
    await prisma.emailLog.create({
      data: {
        toEmail: args.to,
        subject: args.subject,
        kind: args.kind,
        recordType: args.recordType ?? null,
        recordId: args.recordId ?? null,
        status: "SENT",
        sentByUserId: args.userId ?? null,
      },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ສົ່ງບໍ່ສຳເລັດ";
    await prisma.emailLog.create({
      data: {
        toEmail: args.to,
        subject: args.subject,
        kind: args.kind,
        recordType: args.recordType ?? null,
        recordId: args.recordId ?? null,
        status: "FAILED",
        errorMsg: msg,
        sentByUserId: args.userId ?? null,
      },
    });
    return { ok: false, error: msg };
  }
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmtMoney(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

// ────────────── Pre-built email types ──────────────

export async function sendInvoiceEmail(
  invoiceId: string,
  options: { reminder?: boolean; userId?: string | null } = {},
): Promise<SendResult> {
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        user: true,
        items: true,
      },
    }),
    prisma.setting.findUnique({ where: { id: "default" } }),
  ]);
  if (!invoice) return { ok: false, error: "ບໍ່ພົບບິນ" };
  if (!invoice.customer.email) {
    return { ok: false, error: "ລູກຄ້າບໍ່ມີ email" };
  }

  const pdf = await renderInvoicePdf(invoice, settings);
  const company = settings?.shopName ?? "SMLAO";

  const subject = options.reminder
    ? `🔔 ເຕືອນ: ບິນ ${invoice.number} ຍັງບໍ່ໄດ້ຊຳລະ`
    : `📄 ບິນອາກອນ ${invoice.number} ຈາກ ${company}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #b91c1c; margin: 0 0 12px;">${options.reminder ? "ເຕືອນການຊຳລະບິນ" : "ບິນອາກອນ"}</h2>
      <p>ສະບາຍດີ ${invoice.customer.name},</p>
      <p>${
        options.reminder
          ? `ບິນ <strong>${invoice.number}</strong> ຍັງບໍ່ໄດ້ຊຳລະ.`
          : `ສົ່ງບິນ <strong>${invoice.number}</strong> ມາໃຫ້ທ່ານຕາມເອກະສານທີ່ຄັດຕິດ.`
      }</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px;">
        <tr><td style="padding: 4px 8px; color: #6b7280;">ເລກບິນ:</td><td style="padding: 4px 8px; font-family: monospace;">${invoice.number}</td></tr>
        <tr><td style="padding: 4px 8px; color: #6b7280;">ວັນທີ:</td><td style="padding: 4px 8px;">${DATE_FMT.format(invoice.date)}</td></tr>
        ${invoice.dueDate ? `<tr><td style="padding: 4px 8px; color: #6b7280;">ກຳນົດຈ່າຍ:</td><td style="padding: 4px 8px;">${DATE_FMT.format(invoice.dueDate)}</td></tr>` : ""}
        <tr><td style="padding: 4px 8px; color: #6b7280;">ມູນຄ່າທັງໝົດ:</td><td style="padding: 4px 8px; font-weight: bold; color: #b91c1c;">${fmtMoney(invoice.total)} ${invoice.currency}</td></tr>
      </table>
      <p style="font-size: 12px; color: #6b7280;">PDF ບິນຄັດຕິດມາພ້ອມ email ນີ້. ຖ້າມີຄຳຖາມ ກະລຸນາຕິດຕໍ່ ${company}.</p>
      <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">— ${company}${settings?.phone ? ` · ${settings.phone}` : ""}</p>
    </div>
  `;

  return sendEmail({
    to: invoice.customer.email,
    subject,
    html,
    attachments: [
      {
        filename: `${invoice.number}.pdf`,
        content: pdf as unknown as Buffer,
      },
    ],
    kind: options.reminder ? "reminder" : "invoice",
    recordType: "Invoice",
    recordId: invoice.id,
    userId: options.userId ?? null,
  });
}

export async function sendQuotationEmail(
  quotationId: string,
  options: { userId?: string | null } = {},
): Promise<SendResult> {
  const [q, settings] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { customer: true, items: true },
    }),
    prisma.setting.findUnique({ where: { id: "default" } }),
  ]);
  if (!q) return { ok: false, error: "ບໍ່ພົບໃບສະເໜີລາຄາ" };
  if (!q.customer.email) return { ok: false, error: "ລູກຄ້າບໍ່ມີ email" };

  const pdf = await renderQuotationPdf({
    quotation: {
      number: q.number,
      date: q.date,
      validUntil: q.validUntil,
      reference: q.reference,
      subtotal: q.subtotal,
      discount: q.discount,
      vatMode: q.vatMode,
      vatRate: q.vatRate,
      vatAmount: q.vatAmount,
      total: q.total,
      currency: q.currency,
      note: q.note,
      items: q.items.map((it, i) => ({
        sn: i + 1,
        lineType: it.lineType,
        productName: it.productName,
        unit: it.unit,
        quantity: it.quantity,
        priceLak: it.priceLak,
        discount: it.discount,
        taxRate: it.taxRate,
        taxAmount: it.taxAmount,
        total: it.total,
      })),
    },
    customer: {
      name: q.customer.name,
      taxId: q.customer.taxId,
      phone: q.customer.phone,
      email: q.customer.email,
      address: q.customer.address,
    },
    seller: {
      name: settings?.shopName ?? "SMLAO",
      nameEn: settings?.shopNameEn ?? null,
      taxId: settings?.taxId ?? null,
      address: settings?.address ?? null,
      phone: settings?.phone ?? null,
      bankAccountName: settings?.bankAccountName ?? null,
      bankAccount: settings?.bankAccount ?? null,
      bankName: settings?.bankName ?? null,
      licenseNumber: settings?.licenseNumber ?? null,
      licenseDate: settings?.licenseDate ?? null,
    },
  });

  const company = settings?.shopName ?? "SMLAO";
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #b91c1c;">ໃບສະເໜີລາຄາ ${q.number}</h2>
      <p>ສະບາຍດີ ${q.customer.name},</p>
      <p>ຂ້ອຍສົ່ງໃບສະເໜີລາຄາມາໃຫ້ທ່ານພິຈາລະນາ ຕາມເອກະສານທີ່ຄັດຕິດ.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px;">
        <tr><td style="padding: 4px 8px; color: #6b7280;">ມູນຄ່າທັງໝົດ:</td><td style="padding: 4px 8px; font-weight: bold; color: #b91c1c;">${fmtMoney(q.total)} ${q.currency}</td></tr>
        ${q.validUntil ? `<tr><td style="padding: 4px 8px; color: #6b7280;">ໝົດອາຍຸ:</td><td style="padding: 4px 8px;">${DATE_FMT.format(q.validUntil)}</td></tr>` : ""}
      </table>
      <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">— ${company}</p>
    </div>
  `;

  return sendEmail({
    to: q.customer.email,
    subject: `📋 ໃບສະເໜີລາຄາ ${q.number} ຈາກ ${company}`,
    html,
    attachments: [
      { filename: `${q.number}.pdf`, content: pdf as unknown as Buffer },
    ],
    kind: "quotation",
    recordType: "Quotation",
    recordId: q.id,
    userId: options.userId ?? null,
  });
}

/** Test the SMTP config without actually delivering value (echoes to "to"). */
export async function sendTestEmail(
  to: string,
  userId?: string | null,
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: "✓ SMLAO Email ທົດສອບ",
    html: `<p>ນີ້ແມ່ນ email ທົດສອບຈາກລະບົບ SMLAO. ຖ້າທ່ານໄດ້ຮັບ ໝາຍຄວາມວ່າ SMTP ກຳນົດຄ່າສຳເລັດ.</p>`,
    kind: "test",
    userId: userId ?? null,
  });
}
