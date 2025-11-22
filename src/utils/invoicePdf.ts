
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type InvoiceLike = {
  invoice_number?: string;
  client?: string;
  issue_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_percentage?: number;
  tax?: number;
  total?: number;
  total_amount?: number;
  currency?: string;
  payment_status?: string;
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

// Extend jsPDF instance type to include jspdf-autotable's lastAutoTable without using any
type JsPDFWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

type PartyInfo = {
  name?: string;
  address?: string;
  gst?: string;
  pan?: string;
  email?: string;
  phone?: string;
};

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

export async function generateInvoicePdf(
  invoice: InvoiceLike | null,
  payments: PaymentLike[],
  opts?: { raisedByName?: string; businessName?: string; billedToName?: string; billedBy?: PartyInfo; billedTo?: PartyInfo; items?: ItemLike[]; footerLogoUrl?: string; footerText?: string; footerLinkUrl?: string }
): Promise<void> {
  const inv = invoice || {};
  const number = inv.invoice_number || "";
  const client = inv.client || "";
  // Dates and legacy totals are no longer used in UI blocks
  // const issue = formatDate(inv.issue_date);
  // const due = formatDate(inv.due_date);
  // const subtotal = inv.subtotal ?? undefined;
  const taxPct = inv.tax_percentage ?? undefined;
  // const tax = inv.tax ?? (subtotal != null && taxPct != null ? (subtotal * taxPct) / 100 : undefined);
  // const total = inv.total_amount ?? inv.total ?? (subtotal != null && tax != null ? subtotal + tax : undefined);
  const currency = inv.currency || "";
  const status = (inv.payment_status || "pending").replace(/_/g, " ");
  const raisedBy = (opts?.raisedByName || opts?.businessName || "").trim();

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const brandColorRGB: [number, number, number] = [17, 24, 39]; // slate-900
  const accentRGB: [number, number, number] = [86, 55, 149]; // brand #563795
  const borderRGB: [number, number, number] = [229, 231, 235]; // gray-200
  const mutedRGB: [number, number, number] = [107, 114, 128]; // gray-500
  const purpleRGB: [number, number, number] = [86, 55, 149]; // brand #563795

  // Header bar
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("Invoice", 40, 38);
  doc.setFontSize(12);
  if (number) doc.text(`#${number}`, doc.internal.pageSize.getWidth() - 40, 38, { align: "right" });

  // Container
  const left = 40;
  let y = 80;
  const right = doc.internal.pageSize.getWidth() - 40;

  // Billed By and Billed To cards side-by-side (detailed)
  doc.setDrawColor(borderRGB[0], borderRGB[1], borderRGB[2]);
  doc.setLineWidth(1);
  const cardGap = 12;
  const halfWidth = (right - left - cardGap) / 2;
  const billedBy = opts?.billedBy || { name: raisedBy };
  const billedTo = opts?.billedTo || { name: (opts?.billedToName || client || "").toString() };
  const lineH = 14;

  function renderPartyCard(title: string, party: PartyInfo, x: number, yStart: number, w: number): number {
    const innerX = x + 12;
    const maxW = w - 24;
    const addrLines = doc.splitTextToSize((party.address || "—"), maxW);
    // Calculate height needed
    let h = 12; // top padding
    h += 22; // title
    h += 20; // name
    h += 24; // address label
    h += 20; // address start
    h += (Array.isArray(addrLines) ? addrLines.length : 1) * lineH;
    if (party.gst) { h += 22; h += 16; } // GSTIN label/value
    if (party.pan) { h += 22; h += 16; } // PAN label/value
    h += 22; h += 16; // Email label/value
    h += 22; h += 16; // Phone label/value
    h += 12; // bottom padding
    const cardH = Math.max(260, h);

    // Draw background
    doc.setFillColor(248, 245, 252); // light purple background
    doc.roundedRect(x, yStart, w, cardH, 8, 8, "FD");

    // Render content
    let cursorY = yStart + 22;
    doc.setTextColor(purpleRGB[0], purpleRGB[1], purpleRGB[2]);
    doc.setFontSize(16);
    doc.text(title, innerX, cursorY);
    cursorY += 20;
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(14);
    doc.text((party.name || "—"), innerX, cursorY);
    // Address
    cursorY += 24;
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("Address", innerX, cursorY);
    cursorY += 20;
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(11);
    doc.text((Array.isArray(addrLines) ? addrLines : [(party.address || "—")]), innerX, cursorY, { maxWidth: maxW });
    cursorY += (Array.isArray(addrLines) ? addrLines.length : 1) * lineH + 10;
    // GSTIN (if present)
    if (party.gst) {
      doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
      doc.setFontSize(10);
      doc.text("GSTIN", innerX, cursorY);
      cursorY += 16;
      doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
      doc.setFontSize(11);
      doc.text(`${party.gst}`, innerX, cursorY);
      cursorY += 6;
      cursorY += 16;
    }
    // PAN (if present)
    if (party.pan) {
      doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
      doc.setFontSize(10);
      doc.text("PAN", innerX, cursorY);
      cursorY += 16;
      doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
      doc.setFontSize(11);
      doc.text(`${party.pan}`, innerX, cursorY);
      cursorY += 6;
      cursorY += 16;
    }
    // Email
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("Email", innerX, cursorY);
    cursorY += 16;
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(11);
    doc.text(`${party.email || "—"}`, innerX, cursorY);
    cursorY += 6;
    cursorY += 16;
    // Phone
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("Phone", innerX, cursorY);
    cursorY += 16;
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(11);
    doc.text(`${party.phone || "—"}`, innerX, cursorY);

    return cardH;
  }

  const byHeight = renderPartyCard("Billed By", billedBy, left, y, halfWidth);
  const toLeft = left + halfWidth + cardGap;
  const toHeight = renderPartyCard("Billed To", billedTo, toLeft, y, halfWidth);
  y += Math.max(byHeight, toHeight) + 24;

  // Status and totals card
  doc.roundedRect(left, y, right - left, 64, 8, 8);
  doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
  doc.setFontSize(10);
  doc.text("Status", left + 12, y + 18);
  doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
  doc.setFontSize(12);
  doc.text(status, left + 12, y + 36);
  y += 84;

  // Items table (linked milestones)
  const items: ItemLike[] = Array.isArray(opts?.items) ? (opts?.items as ItemLike[]) : [];
  const itemRows = (items || []).map((it) => [
    it.name || "",
    it.description || "",
    formatDate(it.due_date),
    asMoney(it.amount ?? 0),
  ]);
  if (itemRows.length) {
    autoTable(doc, {
      startY: y,
      margin: { left, right },
      head: [["Item", "Description", "Due Date", "Amount"]],
      body: itemRows,
      theme: "grid",
      styles: {
        fontSize: 10,
        lineColor: borderRGB,
        lineWidth: 0.6,
        textColor: brandColorRGB,
        cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      },
      headStyles: {
        fillColor: [86, 55, 149],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: { fillColor: [248, 245, 252] },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 220 },
        2: { cellWidth: 90 },
        3: { halign: "right", cellWidth: 80 },
      },
    });
    const docWithAT: JsPDFWithAutoTable = doc as JsPDFWithAutoTable;
    const finalY = docWithAT.lastAutoTable?.finalY ?? y;
    y = finalY + 16;
    // Subtotal / Tax / Total summary under items with pale grey background and left-side highlight
    const computedSubtotal = items.reduce((acc, it) => acc + (typeof it.amount === "number" ? it.amount : 0), 0);
    const appliedTaxPct = taxPct ?? 0;
    const computedTax = Number((computedSubtotal * (appliedTaxPct / 100)).toFixed(2));
    const computedTotal = Number((computedSubtotal + computedTax).toFixed(2));
    const blockHeight = 120;
    doc.setDrawColor(borderRGB[0], borderRGB[1], borderRGB[2]);
    doc.setFillColor(248, 250, 252); // pale grey background
    doc.roundedRect(left, y, right - left, blockHeight, 8, 8, "FD");
    // Left highlight for Grand Total
    const leftBoxW = Math.max(180, (right - left) * 0.36);
    doc.setFillColor(purpleRGB[0], purpleRGB[1], purpleRGB[2]);
    doc.roundedRect(left + 10, y + 10, leftBoxW - 20, blockHeight - 20, 6, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("Grand Total", left + 22, y + 36);
    doc.setFontSize(18);
    doc.text(`${asMoney(computedTotal)} ${currency}`, left + 22, y + 62);
    doc.setFontSize(10);
    doc.text(amountToWords(computedTotal, currency), left + 22, y + 84, { maxWidth: leftBoxW - 44 });
    // Right detail lines
    const rightStartX = left + leftBoxW + 12;
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("Summary", rightStartX, y + 26);
    doc.setDrawColor(borderRGB[0], borderRGB[1], borderRGB[2]);
    doc.setLineWidth(0.6);
    // Row 1: Subtotal
    doc.setTextColor(brandColorRGB[0], brandColorRGB[1], brandColorRGB[2]);
    doc.setFontSize(11);
    doc.text("Subtotal", rightStartX, y + 46);
    doc.text(`${asMoney(computedSubtotal)}`, right - 12, y + 46, { align: "right" });
    doc.line(rightStartX, y + 52, right - 12, y + 52);
    // Row 2: Tax
    doc.text("Tax", rightStartX, y + 70);
    doc.text(`${asMoney(computedTax)} (${appliedTaxPct?.toFixed?.(2) ?? appliedTaxPct}%)`, right - 12, y + 70, { align: "right" });
    doc.line(rightStartX, y + 76, right - 12, y + 76);
    // Row 3: Total
    doc.text("Total", rightStartX, y + 94);
    doc.text(`${asMoney(computedTotal)} ${currency}`, right - 12, y + 94, { align: "right" });
    y += blockHeight + 16;
  } else {
    // If no items, add a small note
    doc.setTextColor(mutedRGB[0], mutedRGB[1], mutedRGB[2]);
    doc.setFontSize(10);
    doc.text("No items linked to this invoice.", left, y);
    y += 20;
  }

  // Payments table removed per request; invoices will not display payment records

  // Footer: Powered by + centered logo
  const pageH = doc.internal.pageSize.getHeight();
  const footerY = pageH - 40;
  doc.setDrawColor(borderRGB[0], borderRGB[1], borderRGB[2]);
  doc.setLineWidth(0.6);
  doc.line(left, footerY - 14, right, footerY - 14);
  doc.setTextColor(purpleRGB[0], purpleRGB[1], purpleRGB[2]);
  doc.setFontSize(10);
  const footerText = opts?.footerText || 'Powered by';
  const centerX = (left + right) / 2;
  const textWidth = doc.getTextWidth(footerText);
  const logoSize = 16;
  const footerGap = 6;
  
  let groupWidth = textWidth;
  let logoDataUrl: string | null = null;
  if (opts?.footerLogoUrl) {
    // Prefer SVG to PNG for recoloring; fallback to direct image if not SVG
    if (opts.footerLogoUrl.toLowerCase().endsWith('.svg')) {
      logoDataUrl = await loadSvgAsPngDataUrl(opts.footerLogoUrl, purpleRGB, logoSize, logoSize);
    } else {
      logoDataUrl = await loadImageDataUrl(opts.footerLogoUrl);
    }
    if (logoDataUrl) groupWidth += footerGap + logoSize;
  }
  const startX = centerX - groupWidth / 2;
  // Draw logo first, then text to its right (favicon before domain)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', startX, footerY - logoSize + 4, logoSize, logoSize);
    } catch {
      // If image fails, we will fall back to text-only placement below
    }
    doc.text(footerText, startX + logoSize + footerGap, footerY);
  } else {
    doc.text(footerText, startX, footerY);
  }

  // Make the footer group clickable (text + logo)
  const linkUrl = (opts?.footerLinkUrl || 'https://oneinflu.com').trim();
  if (linkUrl) {
    const boxHeight = logoDataUrl ? logoSize : 14;
    const boxTop = footerY - boxHeight;
    doc.link(startX, boxTop, groupWidth, boxHeight + 4, { url: linkUrl });
  }

  const fileName = number ? `Invoice_${number}.pdf` : "Invoice.pdf";
  doc.save(fileName);
}