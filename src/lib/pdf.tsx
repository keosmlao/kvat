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
import { formatNumber, type Currency } from "./format";
import { moneyInLaoWords } from "./lao-words";

// Decorative ornate frame (Lao tax authority style). Lives at
// `public/smlao_backgroud.jpeg` and renders behind every invoice page.
const BG_PATH = path.join(process.cwd(), "public/smlao_backgroud.jpeg");
const HAS_BG = fs.existsSync(BG_PATH);
const FONT_PATH = path.join(process.cwd(), "src/lib/fonts/Phetsarath-Regular.ttf");
const FONT_BOLD_PATH = path.join(process.cwd(), "src/lib/fonts/Phetsarath-Bold.ttf");

Font.register({
  family: "Phetsarath",
  fonts: [
    { src: FONT_PATH, fontWeight: 400 },
    { src: FONT_BOLD_PATH, fontWeight: 700 },
  ],
});

const TEXT = "#111827";
const MUTED = "#374151";
const LINE = "#9ca3af";

const s = StyleSheet.create({
  // Padding sized for the ornate frame: leaves a safe gutter inside the
  // decorative red border so content never overlaps it.
  page: {
    paddingTop: 70,
    paddingBottom: 80,
    paddingHorizontal: 45,
    fontFamily: "Phetsarath",
    fontSize: 9,
    color: TEXT,
    lineHeight: 1.3,
  },

  // Title
  titleBlock: { alignItems: "center", marginBottom: 38 },
  titleMain: { fontSize: 16, fontWeight: 700, textAlign: "center" },
  titleSub: { fontSize: 9, textAlign: "center", marginTop: 10 },
  companyLogo: {
    position: "absolute",
    top: 72,
    left: 58,
    width: 72,
    height: 46,
    objectFit: "contain",
  },
  titleEtaxNo: {
    position: "absolute",
    top: 118,
    right: 45,
    fontSize: 8,
    fontFamily: "Courier",
    fontWeight: 700,
  },
  qrBottomRight: {
    position: "absolute",
    bottom: 42,
    right: 86,
    width: 72,
    height: 72,
  },
  cancelTag: {
    color: "white",
    backgroundColor: "#dc2626",
    padding: 3,
    fontSize: 8,
    textAlign: "center",
    marginTop: 4,
    width: 80,
    alignSelf: "center",
  },

  // Party blocks
  sectionLine: {
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    borderTopStyle: "solid",
  },
  partyBlock: {
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    borderBottomStyle: "solid",
  },
  shopName: { fontSize: 11, fontWeight: 700 },
  shopNameEn: { fontSize: 10, fontWeight: 700 },

  // text rows - slightly tight to match the dense look of the reference
  line: { fontSize: 9, marginTop: 1 },
  label: { color: MUTED },

  // Inline rows split into 2 or 3 columns by flex weight, keeping each
  // item from wrapping into the next.
  rowSplit: { flexDirection: "row", marginTop: 1 },
  rowItem: { flex: 1, fontSize: 9 },
  rowItem2: { flex: 2, fontSize: 9 },
  rowItem3: { flex: 3, fontSize: 9 },

  // Items table
  table: { marginTop: 0, minHeight: 275 },
  tableHead: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: TEXT,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.3,
    borderBottomColor: "#e5e7eb",
    fontSize: 9,
  },
  cNo: { width: 32, paddingHorizontal: 2 },
  cName: { flex: 1, paddingHorizontal: 2 },
  cQty: { width: 42, textAlign: "right", paddingHorizontal: 2 },
  cUnit: { width: 42, textAlign: "center", paddingHorizontal: 2 },
  cPrice: { width: 60, textAlign: "right", paddingHorizontal: 2 },
  cTotal: { width: 65, textAlign: "right", paddingHorizontal: 2 },

  tableBody: {
    minHeight: 243,
  },

  // Totals - right aligned like the reference invoice
  totalsBlock: {
    marginTop: 0,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: TEXT,
    paddingTop: 6,
  },
  totRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 305,
    paddingVertical: 2,
  },
  totRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 305,
    paddingTop: 4,
    fontWeight: 700,
  },
  totLabel: { fontSize: 9 },
  totVal: { fontSize: 9, fontWeight: 700 },
  totValLine: {
    width: 90,
    textAlign: "right",
    borderBottomWidth: 0.5,
    borderBottomColor: TEXT,
    paddingBottom: 1,
  },

  // Push values flush right with a fixed-width value column so the
  // numbers line up vertically across all rows.
  totValueCell: { width: 90, textAlign: "right" },

  amountWords: { marginTop: 34, fontSize: 9 },

  // Signatures (pinned to bottom of the frame, above footer)
  signRow: {
    position: "absolute",
    bottom: 150,
    left: 45,
    right: 45,
    flexDirection: "row",
  },
  signCol: { flex: 1, alignItems: "center" },
  signDate: { fontSize: 9 },
  signRole: { fontSize: 9, marginTop: 2 },

  // eTax block
  etax: {
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    gap: 12,
  },
  etaxInfo: { flex: 1, justifyContent: "center" },
  etaxLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  etaxNumber: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "Courier",
    marginBottom: 2,
  },
  etaxMeta: { fontSize: 8, color: MUTED },
  etaxQr: { width: 80, height: 80 },

  note: {
    marginTop: 10,
    padding: 6,
    backgroundColor: "#f9fafb",
    fontSize: 9,
  },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 78,
    right: 45,
    fontSize: 7,
    color: TEXT,
    textAlign: "left",
  },
  footerLine: { fontSize: 7, color: TEXT, marginTop: 1 },
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
  paymentMethod: string;
  etaxInvoiceNumber?: string | null;
  etaxIssueTime?: string | null;
  etaxCheckCode?: string | null;
  etaxQrUrl?: string | null;
  etaxStatus?: string | null;
  customer: {
    name: string;
    taxId: string | null;
    address: string | null;
    phone: string | null;
    province?: { name: string } | null;
    district?: { name: string } | null;
    village?: { name: string } | null;
  };
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
  logoUrl: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
  licenseNumber: string | null;
  licenseDate: string | null;
} | null;

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function laoText(value: string | null | undefined): string {
  return (value ?? "").normalize("NFC");
}

function publicImagePath(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) {
    return path.join(process.cwd(), "public", url);
  }
  if (url.startsWith("/")) {
    return path.join(process.cwd(), "public", url.slice(1));
  }
  return url;
}

function paymentMethodLabel(method: string): string {
  switch (method) {
    case "CASH":
      return "ເງິນສົດ";
    case "TRANSFER":
      return "ໂອນ";
    default:
      return method;
  }
}

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
  const inCur = (lak: number) =>
    currency === "LAK" ? lak : lak / invoice.exchangeRate;

  const taxExcluding = invoice.subtotal - invoice.discount;
  const dateStr = formatDDMMYYYY(invoice.date);

  const village = invoice.customer.village?.name;
  const district = invoice.customer.district?.name;
  const province = invoice.customer.province?.name;
  const hasStructuredAddress = Boolean(village || district || province);
  const logoPath = publicImagePath(settings?.logoUrl);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {HAS_BG && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image
            src={BG_PATH}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              // Explicit A4 dimensions so the frame fills the page edge to
              // edge - `width: "100%"` alone keeps the image's aspect ratio
              // and leaves a gap at the bottom on portrait sheets.
              width: 595,
              height: 842,
              zIndex: -1,
              objectFit: "fill",
            }}
            fixed
          />
        )}

        {logoPath && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={logoPath} style={s.companyLogo} fixed />
        )}

        {/* eTax QR - bottom-right corner, above the decorative border. */}
        {qrDataUrl && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={qrDataUrl} style={s.qrBottomRight} fixed />
        )}

        {/* Title */}
        {invoice.etaxInvoiceNumber && (
          <Text style={s.titleEtaxNo}>{invoice.etaxInvoiceNumber}</Text>
        )}
        <View style={s.titleBlock}>
          <Text style={s.titleMain}>ໃບເກັບເງິນ/Tax Invoice</Text>
          <Text style={s.titleSub}>(ອາກອນມູນຄ່າເພີ່ມ)</Text>
          {invoice.status === "CANCELLED" && (
            <Text style={s.cancelTag}>ຍົກເລີກ</Text>
          )}
        </View>

        {/* Seller */}
        <View style={s.sectionLine} />
        <View style={s.partyBlock}>
          <Text style={s.shopName}>{laoText(settings?.shopName ?? "ຮ້ານຄ້າ")}</Text>
          {settings?.shopNameEn && (
            <Text style={s.shopNameEn}>{laoText(settings.shopNameEn)}</Text>
          )}
          {settings?.address && (
            <Text style={s.line}>
              <Text style={s.label}>ທີ່ຢູ່: </Text>
              {laoText(settings.address)}
            </Text>
          )}
          {settings?.phone && (
            <Text style={s.line}>
              <Text style={s.label}>ໂທ: </Text>
              {settings.phone}
            </Text>
          )}
          {settings?.taxId && (
            <Text style={s.line}>
              <Text style={s.label}>ເລກປະຈໍາຕົວຜູ້ເສຍອາກອນ: </Text>
              {settings.taxId}
            </Text>
          )}
          {(settings?.bankAccountName || settings?.bankAccount) && (
            <View style={s.rowSplit}>
              <Text style={s.rowItem2}>
                <Text style={s.label}>ຊື່ບັນຊີທະນາຄານ: </Text>
                {laoText(settings?.bankAccountName)}
              </Text>
              <Text style={s.rowItem}>
                <Text style={s.label}>ເລກບັນຊີ: </Text>
                {settings?.bankAccount ?? ""}
                {settings?.bankName ? ` (${laoText(settings.bankName)})` : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Buyer */}
        <View style={s.partyBlock}>
          <Text style={s.line}>
            <Text style={s.label}>ລູກຄ້າ </Text>
            <Text style={{ fontWeight: 700 }}>{laoText(invoice.customer.name)}</Text>
          </Text>

          {hasStructuredAddress ? (
            <View style={s.rowSplit}>
              <Text style={s.rowItem}>
                <Text style={s.label}>ທີ່ຢູ່ບ້ານ: </Text>
                {laoText(village)}
              </Text>
              <Text style={s.rowItem}>
                <Text style={s.label}>ເມືອງ: </Text>
                {laoText(district)}
              </Text>
              <Text style={s.rowItem}>
                <Text style={s.label}>ແຂວງ: </Text>
                {laoText(province)}
              </Text>
            </View>
          ) : (
            invoice.customer.address && (
              <Text style={s.line}>
                <Text style={s.label}>ທີ່ຢູ່: </Text>
                {laoText(invoice.customer.address)}
              </Text>
            )
          )}

          <View style={s.rowSplit}>
            <Text style={s.rowItem}>
              <Text style={s.label}>ເບີໂທ: </Text>
              {invoice.customer.phone ?? ""}
            </Text>
            <Text style={s.rowItem}>
              <Text style={s.label}>ເລກປະຈໍາຕົວຜູ້ເສຍອາກອນ: </Text>
              {invoice.customer.taxId ?? ""}
            </Text>
            <Text style={s.rowItem}>
              <Text style={s.label}>ປະເພດການຈ່າຍ: </Text>
              {paymentMethodLabel(invoice.paymentMethod)}
            </Text>
          </View>

          <View style={s.rowSplit}>
            <Text style={s.rowItem}>
              <Text style={s.label}>ຊື່ບັນຊີທະນາຄານ:</Text>
            </Text>
            <Text style={s.rowItem}>
              <Text style={s.label}>ເລກບັນຊີ:</Text>
            </Text>
          </View>
        </View>

        {/* Items table */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={s.cNo}>ລໍາດັບ</Text>
            <Text style={s.cName}>ເນື້ອໃນລາຍການ</Text>
            <Text style={s.cQty}>ຈໍານວນ</Text>
            <Text style={s.cUnit}>ຫົວໜ່ວຍ</Text>
            <Text style={s.cPrice}>ລາຄາ</Text>
            <Text style={s.cTotal}>ລວມ</Text>
          </View>
          <View style={s.tableBody}>
            {invoice.items.map((it, i) => (
              <View key={it.id} style={s.tableRow}>
                <Text style={s.cNo}>{i + 1}</Text>
                <Text style={s.cName}>{laoText(it.productName)}</Text>
                <Text style={s.cQty}>{formatNumber(it.quantity, 1)}</Text>
                <Text style={s.cUnit}>{laoText(it.unit)}</Text>
                <Text style={s.cPrice}>{formatNumber(inCur(it.priceLak))}</Text>
                <Text style={s.cTotal}>{formatNumber(inCur(it.total))}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals (full width, value column right-aligned) */}
        <View style={s.totalsBlock}>
          <View style={s.totRow}>
            <Text style={s.totLabel}>ລວມມູນຄ່າຂາຍບໍ່ມີອາກອນ:</Text>
            <Text style={[s.totVal, s.totValLine]}>
              {formatNumber(inCur(taxExcluding))}
            </Text>
          </View>
          {invoice.vatMode === "EXEMPT" ? (
            <View style={s.totRow}>
              <Text style={s.totLabel}>ອັດຕາອາກອນມູນຄ່າເພີ່ມ:</Text>
              <Text style={[s.totVal, s.totValLine]}>ຍົກເວັ້ນ</Text>
            </View>
          ) : (
            <View style={s.totRow}>
              <Text style={s.totLabel}>
                ອັດຕາອາກອນມູນຄ່າເພີ່ມ: ອມພ{" "}
                {(invoice.vatRate * 100).toFixed(0)} %, ເປັນຈໍານວນເງິນ:
              </Text>
              <Text style={[s.totVal, s.totValLine]}>
                {formatNumber(inCur(invoice.vatAmount))}
              </Text>
            </View>
          )}
          <View style={s.totRowGrand}>
            <Text style={s.totLabel}>ລວມມູນຄ່າທັງໝົດ:</Text>
            <Text style={[s.totVal, s.totValLine]}>
              {formatNumber(inCur(invoice.total))}
            </Text>
          </View>
        </View>

        {currency === "LAK" && (
          <Text style={s.amountWords}>
            <Text style={s.label}>ຈໍານວນເງິນຂຽນເປັນຕົວໜັງສື: </Text>
            .......... {laoText(moneyInLaoWords(invoice.total))} ..........
          </Text>
        )}

        {/* Signatures */}
        <View style={s.signRow}>
          <View style={s.signCol}>
            <Text style={s.signDate}>ວັນທີ {dateStr}</Text>
            <Text style={s.signRole}>ຜູ້ຊື້</Text>
          </View>
          <View style={s.signCol}>
            <Text style={s.signDate}>ວັນທີ {dateStr}</Text>
            <Text style={s.signRole}>ຜູ້ຂາຍ</Text>
          </View>
        </View>

        {invoice.note && (
          <View style={s.note}>
            <Text style={s.label}>ໝາຍເຫດ</Text>
            <Text>{invoice.note}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>ສ້າງໂດຍ: {laoText(settings?.shopName)}</Text>
          {(settings?.licenseNumber || settings?.licenseDate) && (
            <Text style={s.footerLine}>
              {settings?.licenseNumber
                ? `ໃບອະນຸຍາດເລກທີ: ${laoText(settings.licenseNumber)}`
                : ""}
              {settings?.licenseDate
                ? ` ລົງວັນທີ: ${settings.licenseDate}`
                : ""}
            </Text>
          )}
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
