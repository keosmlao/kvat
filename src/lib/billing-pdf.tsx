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
import { moneyInLaoWords } from "./lao-words";

// Same ornate frame the tenant tax invoice uses — keeps every SMLAO-issued
// document visually consistent.
const BG_PATH = path.join(process.cwd(), "public/smlao_backgroud.jpeg");
const HAS_BG = fs.existsSync(BG_PATH);

Font.register({
  family: "NotoLao",
  src: path.join(process.cwd(), "src/lib/fonts/NotoSansLao-Regular.ttf"),
});

const TEXT = "#111827";
const MUTED = "#374151";
const LINE = "#9ca3af";
const ACCENT = "#b91c1c";

const s = StyleSheet.create({
  page: {
    paddingTop: 75,
    paddingBottom: 80,
    paddingHorizontal: 75,
    fontFamily: "NotoLao",
    fontSize: 9,
    color: TEXT,
    lineHeight: 1.3,
  },

  // Title block
  titleBlock: { alignItems: "center", marginBottom: 10 },
  titleMain: { fontSize: 13, fontWeight: 700, textAlign: "center" },
  titleSub: { fontSize: 9, textAlign: "center", marginTop: 1 },
  titleNo: {
    fontSize: 8,
    fontFamily: "Courier",
    textAlign: "center",
    marginTop: 2,
    color: MUTED,
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

  // Items table — matches tenant tax invoice column widths
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

  paidStamp: {
    position: "absolute",
    top: 220,
    right: 100,
    borderWidth: 2,
    borderColor: "#059669",
    color: "#059669",
    padding: 6,
    fontSize: 18,
    fontWeight: 700,
    transform: "rotate(-12deg)",
  },
});

export type BillingPdfInput = {
  invoice: {
    number: string;
    description: string;
    subtotal: number;
    discount: number;
    vatMode: string;
    vatRate: number;
    vatAmount: number;
    amount: number;
    currency: string;
    issueDate: Date;
    dueDate: Date | null;
    paidAt: Date | null;
    paymentMethod: string | null;
    paymentRef: string | null;
    status: "UNPAID" | "PAID" | "CANCELLED";
    notes: string | null;
    items: {
      sn: number;
      description: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      total: number;
    }[];
  };
  customer: {
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    taxId: string | null;
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
    licenseNumber?: string | null;
    licenseDate?: string | null;
  };
};

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

function paymentMethodLabel(m: string | null) {
  if (m === "CASH") return "ເງິນສົດ";
  if (m === "TRANSFER") return "ໂອນ";
  return "";
}

function BillingDoc({ invoice, customer, seller }: BillingPdfInput) {
  const dateStr = formatDDMMYYYY(invoice.issueDate);
  const currencyLabel = invoice.currency === "LAK" ? "ກີບ" : invoice.currency;
  const taxExcluding = invoice.subtotal - invoice.discount;

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
              width: 595,
              height: 842,
              zIndex: -1,
              objectFit: "fill",
            }}
            fixed
          />
        )}

        <View style={s.titleBlock}>
          <Text style={s.titleMain}>ໃບເກັບເງິນ/Tax Invoice</Text>
          <Text style={s.titleSub}>(ອາກອນມູນຄ່າເພີ່ມ)</Text>
          <Text style={s.titleNo}>{invoice.number}</Text>
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

        {/* Buyer (customer) */}
        <View style={s.partyBlock}>
          <Text style={s.line}>
            <Text style={s.label}>ລູກຄ້າ </Text>
            <Text style={{ fontWeight: 700 }}>{customer.name}</Text>
          </Text>
          {customer.address && (
            <Text style={s.line}>
              <Text style={s.label}>ທີ່ຢູ່: </Text>
              {customer.address}
            </Text>
          )}
          <View style={s.rowSplit}>
            {customer.contactName && (
              <Text style={s.rowItem}>
                <Text style={s.label}>ຜູ້ຮັບຜິດຊອບ: </Text>
                {customer.contactName}
              </Text>
            )}
            {customer.email && (
              <Text style={s.rowItem}>
                <Text style={s.label}>Email: </Text>
                {customer.email}
              </Text>
            )}
          </View>
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
            <Text style={s.rowItem}>
              <Text style={s.label}>ປະເພດການຈ່າຍ: </Text>
              {paymentMethodLabel(invoice.paymentMethod)}
            </Text>
          </View>
          {invoice.dueDate && (
            <Text style={s.line}>
              <Text style={s.label}>ກຳນົດຈ່າຍ: </Text>
              {formatDDMMYYYY(invoice.dueDate)}
            </Text>
          )}
        </View>

        {/* Items table */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={s.cNo}>ລຳດັບ</Text>
            <Text style={s.cName}>ເນື້ອໃນລາຍການ</Text>
            <Text style={s.cQty}>ຈໍານວນ</Text>
            <Text style={s.cUnit}>ຫົວໜ່ວຍ</Text>
            <Text style={s.cPrice}>ລາຄາ</Text>
            <Text style={s.cTotal}>ລວມ</Text>
          </View>
          {invoice.items.map((it) => (
            <View key={it.sn} style={s.tableRow}>
              <Text style={s.cNo}>{it.sn}</Text>
              <Text style={s.cName}>{it.description}</Text>
              <Text style={s.cQty}>{fmtNum(it.quantity)}</Text>
              <Text style={s.cUnit}>{it.unit}</Text>
              <Text style={s.cPrice}>{fmtNum(it.unitPrice)}</Text>
              <Text style={s.cTotal}>{fmtNum(it.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsBlock}>
          <View style={s.totRow}>
            <Text style={s.totLabel}>ລວມມູນຄ່າຂາຍບໍ່ມີອາກອນ:</Text>
            <Text style={[s.totVal, s.totValueCell]}>
              {fmtNum(taxExcluding)}
            </Text>
          </View>
          {invoice.vatMode === "EXEMPT" ? (
            <View style={s.totRow}>
              <Text style={s.totLabel}>ອັດຕາອາກອນມູນຄ່າເພີ່ມ:</Text>
              <Text style={[s.totVal, s.totValueCell]}>ຍົກເວັ້ນ</Text>
            </View>
          ) : (
            <View style={s.totRow}>
              <Text style={s.totLabel}>
                ອັດຕາອາກອນມູນຄ່າເພີ່ມ: ອມພ{" "}
                {(invoice.vatRate * 100).toFixed(0)} %, ເປັນຈໍານວນເງິນ:
              </Text>
              <Text style={[s.totVal, s.totValueCell]}>
                {fmtNum(invoice.vatAmount)}
              </Text>
            </View>
          )}
          <View style={s.totRowGrand}>
            <Text style={s.totLabel}>ລວມມູນຄ່າທັງໝົດ:</Text>
            <Text style={[s.totVal, s.totValueCell, { color: ACCENT }]}>
              {fmtNum(invoice.amount)} {currencyLabel}
            </Text>
          </View>
        </View>

        {invoice.currency === "LAK" && (
          <Text style={s.amountWords}>
            <Text style={s.label}>ຈໍານວນເງິນຂຽນເປັນຕົວໜັງສື: </Text>
            ……….. {moneyInLaoWords(invoice.amount)} ……….
          </Text>
        )}

        {/* PAID stamp */}
        {invoice.status === "PAID" && (
          <Text style={s.paidStamp}>
            ✓ PAID {invoice.paidAt ? formatDDMMYYYY(invoice.paidAt) : ""}
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

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>ສ້າງໂດຍ: {seller.name}</Text>
          {(seller.licenseNumber || seller.licenseDate) && (
            <Text style={s.footerLine}>
              {seller.licenseNumber
                ? `ໃບອະນຸຍາດເລກທີ: ${seller.licenseNumber}`
                : ""}
              {seller.licenseDate ? `   ລົງວັນທີ: ${seller.licenseDate}` : ""}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

export async function renderBillingPdf(input: BillingPdfInput) {
  return renderToBuffer(<BillingDoc {...input} />);
}
