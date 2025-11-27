/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// invoice-pdf.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ---------------------- Types ---------------------- */

type InvoiceLike = {
  invoice_number?: string;
  invoiceNo?: string;
  client?: string;
  clientId?: string;
  issue_date?: string;
  issuedAt?: string;
  due_date?: string;
  dueDate?: string;
  subtotal?: number;
  subTotal?: number;
  tax_percentage?: number;
  taxes?: Array<{ name?: string; ratePercent?: number; amount?: number }>;
  tax?: number;
  total?: number;
  total_amount?: number;
  currency?: string;
  payment_status?: string;
  status?: string;
  items?: Array<{ description?: string; qty?: number; unitPrice?: number; amount?: number; taxRatePercent?: number; taxAmount?: number }>;
  paidAmount?: number;
  balanceDue?: number;
  issuedTo?: { name?: string; company?: string; billingAddress?: string; email?: string; phone?: string; gstNumber?: string };
  projectId?: string;
  quotationId?: string;
  meta?: { poNumber?: string };
  notes?: string | null;
  terms?: string | null;
};

type PaymentLike = {
  payment_date?: string;
  amount?: number;
  mode?: string;
  transaction_id?: string;
  is_verified?: boolean;
};

type ItemLike = {
  name?: string;
  description?: string;
  due_date?: string;
  amount?: number;
};

type PartyInfo = {
  name?: string;
  address?: string;
  gst?: string;
  pan?: string;
  email?: string;
  phone?: string;
};

// Extend jsPDF instance type to include jspdf-autotable's lastAutoTable without using any
type JsPDFWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number }; getNumberOfPages?: () => number; internal: any };

/* ---------------------- Helpers ---------------------- */

function amountToWords(n: number, currency: string): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function chunkToWords(num: number): string {
    let s = "";
    if (num >= 100) {
      s += `${units[Math.floor(num / 100)]} Hundred`;
      num = num % 100;
      if (num) s += " ";
    }
    if (num >= 20) {
      s += tens[Math.floor(num / 10)];
      num = num % 10;
      if (num) s += ` ${units[num]}`;
    } else if (num > 0) {
      s += units[num];
    }
    return s.trim();
  }
  function numberToWords(num: number): string {
    if (!Number.isFinite(num)) return "";
    if (num === 0) return "Zero";
    let words = "";
    const billions = Math.floor(num / 1_000_000_000);
    const millions = Math.floor((num % 1_000_000_000) / 1_000_000);
    const thousands = Math.floor((num % 1_000_000) / 1_000);
    const hundreds = Math.floor(num % 1_000);
    if (billions) words += `${chunkToWords(billions)} Billion`;
    if (millions) words += `${words ? " " : ""}${chunkToWords(millions)} Million`;
    if (thousands) words += `${words ? " " : ""}${chunkToWords(thousands)} Thousand`;
    if (hundreds) words += `${words ? " " : ""}${chunkToWords(hundreds)}`;
    return words;
  }
  const whole = Math.floor(Math.abs(n));
  const fraction = Math.round((Math.abs(n) - whole) * 100);
  const currencyWord = currency === "INR" ? "Rupees" : currency === "USD" ? "Dollars" : currency === "EUR" ? "Euros" : currency === "GBP" ? "Pounds" : "";
  const minorWord = currency === "INR" ? "Paise" : currency === "USD" ? "Cents" : currency === "EUR" ? "Cents" : currency === "GBP" ? "Pence" : "";
  const main = numberToWords(whole);
  const frac = fraction ? `${numberToWords(fraction)} ${minorWord}` : "";
  return `${main} ${currencyWord}${frac ? " and " + frac : ""}`.trim();
}

function asMoney(n: unknown): string {
  if (typeof n === "number") return n.toFixed(2);
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(2) : String(n ?? "");
}

function formatDate(d?: string): string {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadSvgAsPngDataUrl(svgUrl: string, tintRGB?: [number, number, number], width = 20, height = 20): Promise<string | null> {
  try {
    const res = await fetch(svgUrl);
    const svgText = await res.text();
    const hex = tintRGB ? `#${tintRGB.map((c) => c.toString(16).padStart(2, '0')).join('')}` : null;
    const tinted = hex
      ? svgText
          .replace(/fill="(?!none)[^"]+"/gi, `fill="${hex}"`)
          .replace(/stroke="(?!none)[^"]+"/gi, `stroke="${hex}"`)
      : svgText;
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tinted)}`;
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/* ---------------------- Main generator (improved) ---------------------- */

export async function generateInvoicePdf(
  invoice: InvoiceLike | null,
  _payments: PaymentLike[],
  opts?: { raisedByName?: string; businessName?: string; billedToName?: string; billedBy?: PartyInfo; billedTo?: PartyInfo; items?: ItemLike[]; footerLogoUrl?: string; footerText?: string; footerLinkUrl?: string; refs?: string }
): Promise<void> {
  const inv = invoice || {};
  const number = inv.invoiceNo || inv.invoice_number || "";
  const client = inv.clientId || inv.client || "";
  const issue = inv.issuedAt || inv.issue_date || "";
  const due = inv.dueDate || inv.due_date || "";
  const subtotal = inv.subTotal ?? inv.subtotal ?? undefined;
  const taxPct = inv.tax_percentage ?? (Array.isArray(inv.taxes) ? inv.taxes[0]?.ratePercent : undefined);
  const currency = inv.currency || "";
  const status = (inv.status || inv.payment_status || "pending").toString().replace(/_/g, " ");
  const raisedBy = (opts?.raisedByName || opts?.businessName || "").trim();

  const doc = new jsPDF({ unit: "pt", format: "a4" }) as JsPDFWithAutoTable;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Layout constants
  const MARGIN = { left: 48, right: 48, top: 72, bottom: 72 };
  const HEADER_HEIGHT = 64;
  const FOOTER_HEIGHT = 56;
  const CONTENT_TOP = MARGIN.top + HEADER_HEIGHT;
  const CONTENT_BOTTOM = pageH - MARGIN.bottom - FOOTER_HEIGHT;

  // Colors
  const brandColorRGB: [number, number, number] = [17, 24, 39];
  const accentRGB: [number, number, number] = [86, 55, 149];
  const borderRGB: [number, number, number] = [229, 231, 235];
  const mutedRGB: [number, number, number] = [107, 114, 128];
  const purpleRGB = accentRGB;

  // Header
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(0, 0, pageW, HEADER_HEIGHT, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("Invoice", MARGIN.left, HEADER_HEIGHT / 2 + 6);
  doc.setFontSize(12);
  if (number) doc.text(`#${number}`, pageW - MARGIN.right, HEADER_HEIGHT / 2 + 6, { align: "right" });

  // Cursor
  let y = CONTENT_TOP;

  const cardGap = 12;
  const halfWidth = (pageW - MARGIN.left - MARGIN.right - cardGap) / 2;

  const billedBy = opts?.billedBy || { name: raisedBy };
  const billedTo = (inv.issuedTo
    ? { name: inv.issuedTo.name, address: inv.issuedTo.billingAddress, gst: inv.issuedTo.gstNumber, email: inv.issuedTo.email, phone: inv.issuedTo.phone }
    : (opts?.billedTo || { name: (opts?.billedToName || client || "").toString() })) as PartyInfo;

  // helper to estimate height for a party card given width
  function estimatePartyCardHeight(party: PartyInfo, w: number): number {
    const innerW = w - 24;
    const addressLines = doc.splitTextToSize(party.address || "—", innerW);
    let h = 20; // top padding + title
    h += 20; // name
    h += 18; // 'Address' label + spacing
    h += addressLines.length * 12;
    if (party.gst) h += 18 + 12;
    if (party.pan) h += 18 + 12;
    h += 24; // email / phone labels + values
    h += 16; // bottom padding
    return Math.max(110, h);
  }

  const leftCardH = estimatePartyCardHeight(billedBy, halfWidth);
  const rightCardH = estimatePartyCardHeight(billedTo, halfWidth);

  // Decide layout: side-by-side if fits, otherwise stack vertically
  const metaBlockH = 72;
  const spaceNeededSideBySide = Math.max(leftCardH, rightCardH) + 18 + metaBlockH + 20; // card height + gap + meta + small gap
  const availableForCards = CONTENT_BOTTOM - y - 200; // leave room for table header approx
  const useStack = spaceNeededSideBySide > availableForCards;

  function renderPartyCard(title: string, party: PartyInfo, x: number, yStart: number, w: number): number {
    const innerX = x + 12;
    const maxW = w - 24;
    const addrLines = doc.splitTextToSize((party.address || "—"), maxW);
    // calculate actual height
    let h = 12 + 22 + 20 + 18 + addrLines.length * 12;
    if (party.gst) { h += 22; h += 12; }
    if (party.pan) { h += 22; h += 12; }
    h += 22; h += 12; // email
    h += 22; h += 12; // phone
    h += 12;
    const cardH = Math.max(110, h);

    // Draw
    doc.setDrawColor(borderRGB[0], borderRGB[1], borderRGB[2]);
    doc.setLineWidth(0.6);
    doc.setFillColor(250, 249, 252);
    doc.roundedRect(x, yStart, w, cardH, 8, 8, "FD");

    let cursorY = yStart + 22;
    doc.setTextColor(purpleRGB[0], purpleRGB[1], purpleRGB[2]);
    doc.setFontSize(16);
    doc.text(title, innerX, cursorY);
    cursorY += 20;
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(14);
    doc.text((party.name || "—"), innerX, cursorY);
    cursorY += 20;
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("Address", innerX, cursorY);
    cursorY += 16;
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(11);
    doc.text(addrLines, innerX, cursorY, { maxWidth: maxW });
    cursorY += addrLines.length * 12 + 10;
    if (party.gst) {
      doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
      doc.setFontSize(10);
      doc.text("GSTIN", innerX, cursorY);
      cursorY += 14;
      doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
      doc.setFontSize(11);
      doc.text(`${party.gst}`, innerX, cursorY);
      cursorY += 16;
    }
    if (party.pan) {
      doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
      doc.setFontSize(10);
      doc.text("PAN", innerX, cursorY);
      cursorY += 14;
      doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
      doc.setFontSize(11);
      doc.text(`${party.pan}`, innerX, cursorY);
      cursorY += 16;
    }
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("Email", innerX, cursorY);
    cursorY += 14;
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(11);
    doc.text(`${party.email || "—"}`, innerX, cursorY);
    cursorY += 16;
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("Phone", innerX, cursorY);
    cursorY += 14;
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(11);
    doc.text(`${party.phone || "—"}`, innerX, cursorY);

    return cardH;
  }

  if (!useStack) {
    // side-by-side
    const leftH = renderPartyCard("Billed By", billedBy, MARGIN.left, y, halfWidth);
    const rightX = MARGIN.left + halfWidth + cardGap;
    const rightH = renderPartyCard("Billed To", billedTo, rightX, y, halfWidth);
    y += Math.max(leftH, rightH) + 18;
  } else {
    // stacked (full width)
    const fullW = pageW - MARGIN.left - MARGIN.right;
    const h1 = renderPartyCard("Billed By", billedBy, MARGIN.left, y, fullW);
    y += h1 + 12;
    const h2 = renderPartyCard("Billed To", billedTo, MARGIN.left, y, fullW);
    y += h2 + 18;
  }

  // Metadata block
  doc.setDrawColor(borderRGB[0], borderRGB[1], borderRGB[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN.left, y, pageW - MARGIN.left - MARGIN.right, metaBlockH, 6, 6);
  const metaInnerX = MARGIN.left + 12;
  doc.setFontSize(10);
  doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
  doc.text("Status", metaInnerX, y + 18);
  doc.setFontSize(12);
  doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
  doc.text(status, metaInnerX, y + 36);
  doc.setFontSize(10);
  doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
  doc.text("Issue Date", metaInnerX + 180, y + 18);
  doc.setFontSize(12);
  doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
  doc.text(formatDate(issue), metaInnerX + 180, y + 36);
  doc.setFontSize(10);
  doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
  doc.text("Due Date", metaInnerX + 320, y + 18);
  doc.setFontSize(12);
  doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
  doc.text(formatDate(due), metaInnerX + 320, y + 36);
  if (opts?.refs) {
    doc.setFontSize(10);
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.text(String(opts.refs), metaInnerX, y + 56);
  }
  y += metaBlockH + 18;

  // Items table
  const newItems = Array.isArray(inv.items) ? inv.items : [];
  const itemRows = newItems.map((it) => [
    String(it.description || ""),
    String(it.qty ?? 0),
    asMoney(it.unitPrice ?? 0),
    typeof it.taxRatePercent === "number" ? `${it.taxRatePercent.toFixed(2)}%` : "",
    asMoney(it.taxAmount ?? 0),
    asMoney(it.amount ?? 0),
  ]);

  // If there's not enough space to show a few rows, create a new page before the table
  const approxTableHeaderH = 36;
  if (y + approxTableHeaderH > CONTENT_BOTTOM) {
    doc.addPage();
    y = CONTENT_TOP;
  }

  const tableBottomMargin = MARGIN.bottom + FOOTER_HEIGHT + 8;
  if (itemRows.length) {
    const tableWidth = pageW - MARGIN.left - MARGIN.right;

// pick column widths that sum roughly to tableWidth
// adjust fractions if you prefer different proportions
const colWidths: Record<number, number> = {
  0: Math.round(tableWidth * 0.36), // Description — smaller, wraps
  1: 40,                            // Qty
  2: Math.round(tableWidth * 0.16), // Unit Price
  3: Math.round(tableWidth * 0.10), // Tax %
  4: Math.round(tableWidth * 0.14), // Tax Amt
  5: Math.round(tableWidth * 0.14), // Amount
};

// Ensure sum does not exceed tableWidth (adjust last column)
const totalAssigned = Object.values(colWidths).reduce((a, b) => a + b, 0);
if (totalAssigned > tableWidth) {
  const diff = totalAssigned - tableWidth;
  colWidths[5] = Math.max(40, colWidths[5] - diff); // shrink last column if needed
}

autoTable(doc, {
  startY: y,
  margin: { left: MARGIN.left, right: MARGIN.right, bottom: tableBottomMargin },
  head: [["Description", "Qty", "Unit Price", "Tax %", "Tax Amt", "Amount"]],
  body: itemRows,
  theme: "grid",
  tableWidth: "auto", // respect our explicit column widths
  styles: {
    fontSize: 10,
    lineColor: borderRGB,
    lineWidth: 0.6,
    textColor: brandColorRGB,
    cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
    overflow: "linebreak", // THIS ENABLES WRAPPING
    valign: "middle",
  },
  headStyles: {
    fillColor: [86, 55, 149],
    textColor: [255, 255, 255],
    fontStyle: "bold",
    halign: "center",
  },
  alternateRowStyles: { fillColor: [248, 245, 252] },
  columnStyles: {
    0: { cellWidth: colWidths[0], halign: "left" },   // Description (wrap)
    1: { cellWidth: colWidths[1], halign: "right" },  // Qty
    2: { cellWidth: colWidths[2], halign: "right" },  // Unit Price
    3: { cellWidth: colWidths[3], halign: "right" },  // Tax %
    4: { cellWidth: colWidths[4], halign: "right" },  // Tax Amt
    5: { cellWidth: colWidths[5], halign: "right" },  // Amount
  },
  pageBreak: "auto",
  didDrawPage: (_data) => {
    // (optional) add repeating header/footer actions here if needed
  },
});
    // move cursor to after table
    const finalY = (doc as any).lastAutoTable?.finalY ?? y;
    y = finalY + 14;
  } else {
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("No items linked to this invoice.", MARGIN.left, y);
    y += 20;
  }

  // Totals
  const computedSubtotal = typeof subtotal === "number" ? subtotal : newItems.reduce((acc, it) => acc + (typeof it.amount === "number" ? it.amount : 0), 0);
  const appliedTaxPct = typeof taxPct === "number" ? taxPct : 0;
  const taxSummary = Array.isArray(inv.taxes) ? inv.taxes : [];
  const computedTax = taxSummary.length ? taxSummary.reduce((acc, t) => acc + (typeof t.amount === "number" ? t.amount : 0), 0) : Number((computedSubtotal * (appliedTaxPct / 100)).toFixed(2));
  const explicitTotal = inv.total ?? inv.total_amount;
  const computedTotal = typeof explicitTotal === "number" ? explicitTotal : Number((computedSubtotal + computedTax).toFixed(2));

  const summaryBlockH = 120;
  // If not enough room to draw summary block, create new page
  if (y + summaryBlockH > CONTENT_BOTTOM) {
    doc.addPage();
    y = CONTENT_TOP;
  }

  doc.setDrawColor(borderRGB[0], borderRGB[1], borderRGB[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN.left, y, pageW - MARGIN.left - MARGIN.right, summaryBlockH, 8, 8, "FD");

  const leftBoxW = Math.max(180, (pageW - MARGIN.left - MARGIN.right) * 0.36);
  doc.setFillColor(purpleRGB[0], purpleRGB[1], purpleRGB[2]);
  doc.roundedRect(MARGIN.left + 10, y + 10, leftBoxW - 20, summaryBlockH - 20, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text("Grand Total", MARGIN.left + 22, y + 36);
  doc.setFontSize(18);
  doc.text(`${asMoney(computedTotal)} ${currency}`, MARGIN.left + 22, y + 62);
  doc.setFontSize(10);
  doc.text(amountToWords(computedTotal, currency), MARGIN.left + 22, y + 84, { maxWidth: leftBoxW - 44 });

  const rightStartX = MARGIN.left + leftBoxW + 18;
  doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
  doc.setFontSize(10);
  doc.text("Summary", rightStartX, y + 26);
  doc.setFontSize(11);
  doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
  doc.text("Subtotal", rightStartX, y + 46);
  doc.text(`${asMoney(computedSubtotal)}`, pageW - MARGIN.right - 12, y + 46, { align: "right" });
  doc.setLineWidth(0.6);
  doc.line(rightStartX, y + 52, pageW - MARGIN.right - 12, y + 52);
  doc.text("Tax", rightStartX, y + 70);
  if (taxSummary.length) {
    const label = taxSummary.map((t) => `${asMoney(t.amount)} ${t.name || (typeof t.ratePercent === "number" ? `${t.ratePercent}%` : "")}`).join("  •  ");
    doc.text(label, pageW - MARGIN.right - 12, y + 70, { align: "right" });
  } else {
    doc.text(`${asMoney(computedTax)} (${appliedTaxPct.toFixed(2)}%)`, pageW - MARGIN.right - 12, y + 70, { align: "right" });
  }
  doc.line(rightStartX, y + 76, pageW - MARGIN.right - 12, y + 76);
  doc.text("Total", rightStartX, y + 94);
  doc.text(`${asMoney(computedTotal)} ${currency}`, pageW - MARGIN.right - 12, y + 94, { align: "right" });
  y += summaryBlockH + 12;

  // Payment summary if any
  const paidAmt = inv.paidAmount ?? 0;
  const balanceDue = inv.balanceDue ?? (typeof inv.total === "number" ? Number(inv.total) - paidAmt : undefined);
  if (typeof balanceDue === "number") {
    if (y + 40 > CONTENT_BOTTOM) {
      doc.addPage();
      y = CONTENT_TOP;
    }
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("Payment", MARGIN.left, y);
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(11);
    doc.text(`Paid: ${asMoney(paidAmt)} ${currency}    Balance Due: ${asMoney(balanceDue)} ${currency}`, MARGIN.left, y + 18);
    y += 32;
  }

  // Notes / terms
  const terms = inv.terms || inv.notes || "";
  if (terms && terms.toString().trim().length > 0) {
    if (y + 100 > CONTENT_BOTTOM) {
      doc.addPage();
      y = CONTENT_TOP;
    }
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("Notes / Terms", MARGIN.left, y);
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(String(terms), pageW - MARGIN.left - MARGIN.right);
    doc.text(lines, MARGIN.left, y + 18);
    y += 18 + lines.length * 14;
  }

  // Footer - compute total pages with a safe fallback (TypeScript typings differ between jspdf versions)
  const totalPages = (doc as any).getNumberOfPages?.() ?? (doc.internal as any).getNumberOfPages?.() ?? 1;

  let footerLogoDataUrl: string | null = null;
  if (opts?.footerLogoUrl) {
    try {
      footerLogoDataUrl = opts.footerLogoUrl.toLowerCase().endsWith(".svg")
        ? await loadSvgAsPngDataUrl(opts.footerLogoUrl, purpleRGB, 14, 14)
        : await loadImageDataUrl(opts.footerLogoUrl);
    } catch {
      footerLogoDataUrl = null;
    }
  }

  const footerText = opts?.footerText || "Powered by";
  const footerLink = (opts?.footerLinkUrl || "https://oneinflu.com").trim();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageH - MARGIN.bottom - (FOOTER_HEIGHT / 2);
    doc.setDrawColor(borderRGB[0], borderRGB[1], borderRGB[2]);
    doc.setLineWidth(0.6);
    doc.line(MARGIN.left, footerY - 14, pageW - MARGIN.right, footerY - 14);

    const textWidth = doc.getTextWidth(footerText);
    const logoSize = footerLogoDataUrl ? 14 : 0;
    const gap = footerLogoDataUrl ? 6 : 0;
    const groupWidth = textWidth + logoSize + gap;
    const groupX = (pageW - groupWidth) / 2;

    if (footerLogoDataUrl) {
      try {
        doc.addImage(footerLogoDataUrl, "PNG", groupX, footerY - logoSize + 3, logoSize, logoSize);
      } catch {
        // ignore image errors
      }
      doc.setTextColor(purpleRGB[0], purpleRGB[1], purpleRGB[2]);
      doc.setFontSize(10);
      doc.text(footerText, groupX + logoSize + gap, footerY);
    } else {
      doc.setTextColor(purpleRGB[0], purpleRGB[1], purpleRGB[2]);
      doc.setFontSize(10);
      doc.text(footerText, groupX, footerY);
    }

    doc.setFontSize(9);
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.text(`Page ${i} of ${totalPages}`, pageW - MARGIN.right, footerY, { align: "right" });

    if (footerLink) {
      const boxTop = footerY - (logoSize || 10);
      try {
        doc.link(groupX, boxTop, groupWidth, (logoSize || 12) + 6, { url: footerLink });
      } catch {
        // ignore
      }
    }
  }

  // Save file
  const fileName = number ? `Invoice_${number}.pdf` : "Invoice.pdf";
  doc.save(fileName);
}

export default generateInvoicePdf;
