import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { formatDateTime, formatMoney, type Currency } from "./format";

// Optional decorative background (Lao tax watermark). Drop a file at
// `public/invoice-bg.png` and it will appear behind every invoice page.
const BG_PATH = path.join(process.cwd(), "public/invoice-bg.png");
const HAS_BG = fs.existsSync(BG_PATH);

Font.register({
  family: "NotoLao",
  src: path.join(process.cwd(), "src/lib/fonts/NotoSansLao-Regular.ttf"),
});

const s = StyleSheet.create({
  page: { padding: 32, fontFamily: "NotoLao", fontSize: 10, color: "#111827" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottom: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 16,
  },
  shopName: { fontSize: 16, fontWeight: 700 },
  subText: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  title: { fontSize: 22, fontWeight: 700, color: "#2563eb", textAlign: "right" },
  subTitle: { fontSize: 9, color: "#6b7280", textAlign: "right" },
  cancelTag: {
    color: "white",
    backgroundColor: "#dc2626",
    padding: 4,
    fontSize: 8,
    textAlign: "center",
    marginTop: 4,
  },
  sectionRow: { flexDirection: "row", marginBottom: 16 },
  col: { flex: 1 },
  label: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 },
  bold: { fontWeight: 700 },
  table: { borderTop: 1, borderBottom: 1, borderColor: "#e5e7eb", marginTop: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    padding: 6,
    fontSize: 8,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  cellNo: { width: 22 },
  cellName: { flex: 2 },
  cellQty: { width: 60, textAlign: "right" },
  cellPrice: { width: 80, textAlign: "right" },
  cellTotal: { width: 80, textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  grandRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    paddingTop: 6,
    borderTop: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 4,
    fontWeight: 700,
  },
  grandValue: { color: "#2563eb", fontSize: 14 },
  signRow: { flexDirection: "row", marginTop: 50, gap: 60 },
  signCol: { flex: 1, borderTop: 1, borderTopColor: "#9ca3af", paddingTop: 4, textAlign: "center" },
  note: { marginTop: 16, padding: 8, backgroundColor: "#f9fafb", fontSize: 9 },
  etaxBlock: {
    flexDirection: "row",
    marginTop: 18,
    padding: 8,
    borderTop: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  etaxInfo: { flex: 1, justifyContent: "center" },
  etaxLabel: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  etaxNumber: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "Courier",
    color: "#111827",
    marginBottom: 4,
  },
  etaxMeta: { fontSize: 8, color: "#6b7280" },
  etaxQr: { width: 90, height: 90 },
});

type InvoiceWithRelations = {
  id: string;
  number: string;
  date: Date;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discount: number;
  vatRate: number;
  vatMode: string;
  vatAmount: number;
  total: number;
  status: string;
  note: string | null;
  // eTax fields (optional — empty until submitted)
  etaxInvoiceNumber?: string | null;
  etaxIssueTime?: string | null;
  etaxCheckCode?: string | null;
  etaxQrUrl?: string | null;
  etaxStatus?: string | null;
  customer: { name: string; taxId: string | null; address: string | null; phone: string | null };
  user: { name: string };
  items: {
    id: string;
    productName: string;
    unit: string;
    quantity: number;
    priceLak: number;
    discount: number;
    total: number;
  }[];
};

type Settings = {
  shopName: string;
  shopNameEn: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
} | null;

function InvoicePdf({
  invoice,
  settings,
  qrDataUrl,
}: {
  invoice: InvoiceWithRelations;
  settings: Settings;
  qrDataUrl: string | null;
}) {
  const currency = invoice.currency as Currency;
  const inCur = (lak: number) => (currency === "LAK" ? lak : lak / invoice.exchangeRate);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {HAS_BG && (
          <Image
            src={BG_PATH}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: -1,
            }}
            fixed
          />
        )}
        <View style={s.header}>
          <View>
            <Text style={s.shopName}>{settings?.shopName ?? "ຮ້ານຄ້າ"}</Text>
            {settings?.shopNameEn && <Text style={s.subText}>{settings.shopNameEn}</Text>}
            {settings?.address && <Text style={s.subText}>{settings.address}</Text>}
            {settings?.phone && <Text style={s.subText}>ໂທ: {settings.phone}</Text>}
            {settings?.taxId && <Text style={s.subText}>ເລກອາກອນ: {settings.taxId}</Text>}
          </View>
          <View>
            <Text style={s.title}>ໃບບິນອາກອນ</Text>
            <Text style={s.subTitle}>TAX INVOICE</Text>
            {invoice.status === "CANCELLED" && <Text style={s.cancelTag}>ຍົກເລີກ</Text>}
          </View>
        </View>

        <View style={s.sectionRow}>
          <View style={s.col}>
            <Text style={s.label}>ລູກຄ້າ</Text>
            <Text style={s.bold}>{invoice.customer.name}</Text>
            {invoice.customer.taxId && <Text style={s.subText}>ເລກອາກອນ: {invoice.customer.taxId}</Text>}
            {invoice.customer.address && <Text style={s.subText}>{invoice.customer.address}</Text>}
            {invoice.customer.phone && <Text style={s.subText}>ໂທ: {invoice.customer.phone}</Text>}
          </View>
          <View style={s.col}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.subText}>ເລກບິນ:</Text>
              <Text style={s.bold}>{invoice.number}</Text>
            </View>
            {invoice.etaxInvoiceNumber && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={s.subText}>ເລກບິນ eTax:</Text>
                <Text style={[s.bold, { fontFamily: "Courier", fontSize: 9 }]}>
                  {invoice.etaxInvoiceNumber}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.subText}>ວັນທີ:</Text>
              <Text>{formatDateTime(invoice.date)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.subText}>ສະກຸນເງິນ:</Text>
              <Text>{invoice.currency}</Text>
            </View>
            {invoice.currency !== "LAK" && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={s.subText}>ອັດຕາແລກ:</Text>
                <Text>{invoice.exchangeRate.toLocaleString()} ກີບ/{invoice.currency}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.subText}>ຜູ້ອອກ:</Text>
              <Text>{invoice.user.name}</Text>
            </View>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={s.cellNo}>#</Text>
            <Text style={s.cellName}>ສິນຄ້າ</Text>
            <Text style={s.cellQty}>ຈຳນວນ</Text>
            <Text style={s.cellPrice}>ລາຄາ</Text>
            <Text style={s.cellTotal}>ລວມ</Text>
          </View>
          {invoice.items.map((it, i) => (
            <View key={it.id} style={s.tableRow}>
              <Text style={s.cellNo}>{i + 1}</Text>
              <Text style={s.cellName}>{it.productName}</Text>
              <Text style={s.cellQty}>{it.quantity} {it.unit}</Text>
              <Text style={s.cellPrice}>{formatMoney(inCur(it.priceLak), currency)}</Text>
              <Text style={s.cellTotal}>{formatMoney(inCur(it.total), currency)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>ລວມຍ່ອຍ</Text>
            <Text>{formatMoney(inCur(invoice.subtotal), currency)}</Text>
          </View>
          {invoice.discount > 0 && (
            <View style={s.totalRow}>
              <Text>ສ່ວນຫຼຸດ</Text>
              <Text>- {formatMoney(inCur(invoice.discount), currency)}</Text>
            </View>
          )}
          {invoice.vatMode === "EXEMPT" ? (
            <View style={s.totalRow}>
              <Text>VAT</Text>
              <Text>ຍົກເວັ້ນ</Text>
            </View>
          ) : (
            <View style={s.totalRow}>
              <Text>
                VAT {(invoice.vatRate * 100).toFixed(0)}%
                {invoice.vatMode === "INCLUSIVE" ? " (ລວມໃນ)" : ""}
              </Text>
              <Text>{formatMoney(inCur(invoice.vatAmount), currency)}</Text>
            </View>
          )}
          <View style={s.grandRow}>
            <Text>ຈຳນວນລວມ</Text>
            <Text style={s.grandValue}>{formatMoney(inCur(invoice.total), currency)}</Text>
          </View>
        </View>

        {invoice.note && (
          <View style={s.note}>
            <Text style={s.label}>ໝາຍເຫດ</Text>
            <Text>{invoice.note}</Text>
          </View>
        )}

        {/* eTax block — only when invoice has been submitted */}
        {invoice.etaxInvoiceNumber && (
          <View style={s.etaxBlock}>
            <View style={s.etaxInfo}>
              <Text style={s.etaxLabel}>ໃບອາກອນເອເລັກໂຕຣນິກ (eTax)</Text>
              <Text style={s.etaxNumber}>{invoice.etaxInvoiceNumber}</Text>
              {invoice.etaxIssueTime && (
                <Text style={s.etaxMeta}>
                  ວັນທີອອກ: {invoice.etaxIssueTime}
                </Text>
              )}
              {invoice.etaxCheckCode && (
                <Text style={s.etaxMeta}>
                  Check Code: {invoice.etaxCheckCode}
                </Text>
              )}
              {invoice.etaxStatus === "1" && (
                <Text style={[s.etaxMeta, { color: "#059669", marginTop: 2 }]}>
                  ✓ ຢືນຢັນແລ້ວໂດຍກົມສ່ວຍສາ
                </Text>
              )}
              {invoice.etaxStatus === "0" && (
                <Text style={[s.etaxMeta, { color: "#2563eb", marginTop: 2 }]}>
                  ⧗ ລໍຖ້າຢືນຢັນ
                </Text>
              )}
              {invoice.etaxStatus === "3" && (
                <Text style={[s.etaxMeta, { color: "#dc2626", marginTop: 2 }]}>
                  ✕ ບໍ່ຜ່ານການກວດສອບ
                </Text>
              )}
            </View>
            {qrDataUrl && (
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <Image src={qrDataUrl} style={s.etaxQr} />
                <Text style={[s.etaxMeta, { marginTop: 2 }]}>
                  Scan to verify
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={s.signRow}>
          <View style={s.signCol}><Text>ລາຍເຊັນຜູ້ຮັບ</Text></View>
          <View style={s.signCol}><Text>ລາຍເຊັນຜູ້ອອກ</Text></View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(
  invoice: InvoiceWithRelations,
  settings: Settings,
) {
  let qrDataUrl: string | null = null;
  if (invoice.etaxQrUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(invoice.etaxQrUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 200,
      });
    } catch {
      qrDataUrl = null;
    }
  }
  return renderToBuffer(
    <InvoicePdf
      invoice={invoice}
      settings={settings}
      qrDataUrl={qrDataUrl}
    />,
  );
}
