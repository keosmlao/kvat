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
import { formatNumber } from "./format";
import { moneyInLaoWords } from "./lao-words";

const BG_PATH = path.join(process.cwd(), "public/smlao_backgroud.jpeg");
const HAS_BG = fs.existsSync(BG_PATH);
const FONT_PATH = path.join(process.cwd(), "src/lib/fonts/Phetsarath-Regular.ttf");
const FONT_BOLD_PATH = path.join(process.cwd(), "src/lib/fonts/Phetsarath-Bold.ttf");

// Falls back to NotoLao if Phetsarath isn't present (some installs only have one).
const PHETSARATH_AVAILABLE = fs.existsSync(FONT_PATH);
const FONT_FAMILY = PHETSARATH_AVAILABLE ? "Phetsarath" : "NotoLao";

if (PHETSARATH_AVAILABLE) {
  Font.register({
    family: "Phetsarath",
    fonts: [
      { src: FONT_PATH, fontWeight: 400 },
      ...(fs.existsSync(FONT_BOLD_PATH)
        ? [{ src: FONT_BOLD_PATH, fontWeight: 700 as const }]
        : []),
    ],
  });
} else {
  Font.register({
    family: "NotoLao",
    src: path.join(process.cwd(), "src/lib/fonts/NotoSansLao-Regular.ttf"),
  });
}

const TEXT = "#111827";
const MUTED = "#374151";
const LINE = "#9ca3af";
const ACCENT = "#b91c1c";

const s = StyleSheet.create({
  page: {
    paddingTop: 75,
    paddingBottom: 80,
    paddingHorizontal: 75,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    color: TEXT,
    lineHeight: 1.3,
  },
  titleBlock: { alignItems: "center", marginBottom: 10 },
  titleMain: { fontSize: 14, fontWeight: 700, textAlign: "center" },
  titleSub: { fontSize: 9, textAlign: "center", marginTop: 2 },
  titleNo: {
    fontSize: 11,
    fontFamily: "Courier",
    textAlign: "center",
    marginTop: 4,
    fontWeight: 700,
  },

  partyBlock: {
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  shopName: { fontSize: 11, fontWeight: 700 },
  shopNameEn: { fontSize: 10, fontWeight: 700 },
  line: { fontSize: 9, marginTop: 1 },
  label: { color: MUTED },
  rowSplit: { flexDirection: "row", marginTop: 1 },
  rowItem: { flex: 1, fontSize: 9 },

  table: { marginTop: 6 },
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

  totalsBlock: { marginTop: 12 },
  totRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.3,
    borderBottomColor: LINE,
  },
  totRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: TEXT,
    fontWeight: 700,
  },
  totLabel: { fontSize: 9 },
  totVal: { fontSize: 9, fontWeight: 700 },
  totValueCell: { width: 90, textAlign: "right" },

  amountWords: { marginTop: 12, fontSize: 9 },

  validityNote: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#fef3c7",
    borderWidth: 0.5,
    borderColor: "#fcd34d",
    fontSize: 9,
    color: "#92400e",
  },

  signRow: {
    position: "absolute",
    bottom: 100,
    left: 75,
    right: 75,
    flexDirection: "row",
  },
  signCol: { flex: 1, alignItems: "center" },
  signDate: { fontSize: 9 },
  signRole: { fontSize: 9, marginTop: 2 },

  footer: {
    position: "absolute",
    bottom: 45,
    left: 75,
    right: 75,
    fontSize: 8,
    color: MUTED,
    textAlign: "left",
  },
  footerLine: { fontSize: 8, color: MUTED, marginTop: 1 },
});

export type QuotationPdfInput = {
  quotation: {
    number: string;
    date: Date;
    validUntil: Date | null;
    reference: string | null;
    subtotal: number;
    discount: number;
    vatMode: string;
    vatRate: number;
    vatAmount: number;
    total: number;
    currency: string;
    note: string | null;
    items: {
      sn: number;
      lineType: string;
      productName: string;
      unit: string;
      quantity: number;
      priceLak: number;
      discount: number;
      taxRate: number;
      taxAmount: number;
      total: number;
    }[];
  };
  customer: {
    name: string;
    taxId: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  seller: {
    name: string;
    nameEn: string | null;
    taxId: string | null;
    address: string | null;
    phone: string | null;
    bankAccountName: string | null;
    bankAccount: string | null;
    bankName: string | null;
    licenseNumber: string | null;
    licenseDate: string | null;
  };
};

function ddmmyyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

function vatRateLabel(
  items: QuotationPdfInput["quotation"]["items"],
  fallbackRate: number,
): string {
  const rates = Array.from(
    new Set(
      items
        .filter((item) => item.lineType === "PRODUCT")
        .map((item) => item.taxRate),
    ),
  );
  if (rates.length === 0) return `${(fallbackRate * 100).toFixed(0)} %`;
  if (rates.length === 1) return `${(rates[0] * 100).toFixed(0)} %`;
  return "ຕາມແຕ່ລະລາຍການ";
}

function QuotationDoc({ quotation, customer, seller }: QuotationPdfInput) {
  const dateStr = ddmmyyyy(quotation.date);
  const currencyLabel = quotation.currency === "LAK" ? "ກີບ" : quotation.currency;
  const afterDiscount = Math.max(0, quotation.subtotal - quotation.discount);
  const taxExcluding =
    quotation.vatMode === "INCLUSIVE"
      ? Math.max(0, afterDiscount - quotation.vatAmount)
      : afterDiscount;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {HAS_BG && (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt.
          <Image
            src={BG_PATH}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 595,
              height: 842,
              zIndex: -1,
              objectFit: "fill",
            }}
            fixed
          />
        )}

        <View style={s.titleBlock}>
          <Text style={s.titleMain}>ໃບສະເໜີລາຄາ/Quotation</Text>
          <Text style={s.titleSub}>(ບໍ່ແມ່ນບິນ — ສະເພາະການສະເໜີລາຄາ)</Text>
          <Text style={s.titleNo}>{quotation.number}</Text>
        </View>

        {/* Seller */}
        <View style={s.partyBlock}>
          <Text style={s.shopName}>{seller.name}</Text>
          {seller.nameEn && <Text style={s.shopNameEn}>{seller.nameEn}</Text>}
          {seller.address && (
            <Text style={s.line}>
              <Text style={s.label}>ທີ່ຢູ່: </Text>
              {seller.address}
            </Text>
          )}
          {seller.phone && (
            <Text style={s.line}>
              <Text style={s.label}>ໂທ: </Text>
              {seller.phone}
            </Text>
          )}
          {seller.taxId && (
            <Text style={s.line}>
              <Text style={s.label}>ເລກປະຈໍາຕົວຜູ້ເສຍອາກອນ: </Text>
              {seller.taxId}
            </Text>
          )}
          {(seller.bankAccountName || seller.bankAccount) && (
            <View style={s.rowSplit}>
              <Text style={s.rowItem}>
                <Text style={s.label}>ຊື່ບັນຊີທະນາຄານ: </Text>
                {seller.bankAccountName ?? ""}
              </Text>
              <Text style={s.rowItem}>
                <Text style={s.label}>ເລກບັນຊີ: </Text>
                {seller.bankAccount ?? ""}
                {seller.bankName ? ` (${seller.bankName})` : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Buyer */}
        <View style={s.partyBlock}>
          <Text style={s.line}>
            <Text style={s.label}>ສະເໜີໃຫ້ </Text>
            <Text style={{ fontWeight: 700 }}>{customer.name}</Text>
          </Text>
          {customer.address && (
            <Text style={s.line}>
              <Text style={s.label}>ທີ່ຢູ່: </Text>
              {customer.address}
            </Text>
          )}
          <View style={s.rowSplit}>
            {customer.phone && (
              <Text style={s.rowItem}>
                <Text style={s.label}>ໂທ: </Text>
                {customer.phone}
              </Text>
            )}
            {customer.taxId && (
              <Text style={s.rowItem}>
                <Text style={s.label}>ເລກປະຈໍາຕົວຜູ້ເສຍອາກອນ: </Text>
                {customer.taxId}
              </Text>
            )}
          </View>
          {quotation.reference && (
            <Text style={s.line}>
              <Text style={s.label}>ການອ້າງອີງ: </Text>
              {quotation.reference}
            </Text>
          )}
        </View>

        {/* Items */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={s.cNo}>ລຳດັບ</Text>
            <Text style={s.cName}>ເນື້ອໃນລາຍການ</Text>
            <Text style={s.cQty}>ຈໍານວນ</Text>
            <Text style={s.cUnit}>ຫົວໜ່ວຍ</Text>
            <Text style={s.cPrice}>ລາຄາ</Text>
            <Text style={s.cTotal}>ລວມ</Text>
          </View>
          {quotation.items.map((it) =>
            it.lineType === "SECTION" || it.lineType === "NOTE" ? (
              <View key={it.sn} style={s.tableRow}>
                <Text style={s.cNo}>{it.sn}</Text>
                <Text
                  style={[
                    s.cName,
                    it.lineType === "SECTION" ? { fontWeight: 700 } : {},
                  ]}
                >
                  {it.productName}
                </Text>
                <Text style={s.cQty}></Text>
                <Text style={s.cUnit}></Text>
                <Text style={s.cPrice}></Text>
                <Text style={s.cTotal}></Text>
              </View>
            ) : (
              <View key={it.sn} style={s.tableRow}>
                <Text style={s.cNo}>{it.sn}</Text>
                <Text style={s.cName}>{it.productName}</Text>
                <Text style={s.cQty}>{formatNumber(it.quantity, 1)}</Text>
                <Text style={s.cUnit}>{it.unit}</Text>
                <Text style={s.cPrice}>{fmtNum(it.priceLak)}</Text>
                <Text style={s.cTotal}>{fmtNum(it.total)}</Text>
              </View>
            ),
          )}
        </View>

        {/* Totals */}
        <View style={s.totalsBlock}>
          <View style={s.totRow}>
            <Text style={s.totLabel}>ລວມມູນຄ່າຂາຍບໍ່ມີອາກອນ:</Text>
            <Text style={[s.totVal, s.totValueCell]}>
              {fmtNum(taxExcluding)}
            </Text>
          </View>
          {quotation.vatMode === "EXEMPT" ? (
            <View style={s.totRow}>
              <Text style={s.totLabel}>ອັດຕາອາກອນມູນຄ່າເພີ່ມ:</Text>
              <Text style={[s.totVal, s.totValueCell]}>ຍົກເວັ້ນ</Text>
            </View>
          ) : (
            <View style={s.totRow}>
              <Text style={s.totLabel}>
                ອັດຕາອາກອນມູນຄ່າເພີ່ມ: ອມພ{" "}
                {vatRateLabel(quotation.items, quotation.vatRate)}, ເປັນຈໍານວນເງິນ:
              </Text>
              <Text style={[s.totVal, s.totValueCell]}>
                {fmtNum(quotation.vatAmount)}
              </Text>
            </View>
          )}
          <View style={s.totRowGrand}>
            <Text style={s.totLabel}>ລວມມູນຄ່າທັງໝົດ:</Text>
            <Text style={[s.totVal, s.totValueCell, { color: ACCENT }]}>
              {fmtNum(quotation.total)} {currencyLabel}
            </Text>
          </View>
        </View>

        {quotation.currency === "LAK" && (
          <Text style={s.amountWords}>
            <Text style={s.label}>ຈໍານວນເງິນຂຽນເປັນຕົວໜັງສື: </Text>
            ……….. {moneyInLaoWords(quotation.total)} ……….
          </Text>
        )}

        {quotation.validUntil && (
          <Text style={s.validityNote}>
            ⚠ ໃບສະເໜີລາຄານີ້ມີຜົນຮອດ {ddmmyyyy(quotation.validUntil)} ເທົ່ານັ້ນ
          </Text>
        )}

        {/* Signatures */}
        <View style={s.signRow}>
          <View style={s.signCol}>
            <Text style={s.signDate}>ວັນທີ {dateStr}</Text>
            <Text style={s.signRole}>ຜູ້ສະເໜີ (ຜູ້ຂາຍ)</Text>
          </View>
          <View style={s.signCol}>
            <Text style={s.signDate}>ວັນທີ ………………</Text>
            <Text style={s.signRole}>ຜູ້ຮັບ (ລູກຄ້າ)</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>ສ້າງໂດຍ: {seller.name}</Text>
          {(seller.licenseNumber || seller.licenseDate) && (
            <Text style={s.footerLine}>
              {seller.licenseNumber
                ? `ໃບອະນຸຍາດເລກທີ: ${seller.licenseNumber}`
                : ""}
              {seller.licenseDate
                ? `   ລົງວັນທີ: ${seller.licenseDate}`
                : ""}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotationPdf(input: QuotationPdfInput) {
  return renderToBuffer(<QuotationDoc {...input} />);
}
