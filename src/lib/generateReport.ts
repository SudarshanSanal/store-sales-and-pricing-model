/**
 * generateReport.ts
 * Produces a branded PDF executive board report from the live forecast store.
 * Uses jsPDF + jsPDF-AutoTable for tabular sections.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ForecastResult,
  deriveKpis,
  deriveModelComparison,
  deriveInventory,
} from "./forecastStore";

// helpers
const fmt = (n: number, decimals = 0) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
const fmtRs = (n: number) => `Rs.${fmt(Math.round(n))}`;
function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Colours
const BRAND = { r: 99,  g: 102, b: 241 };
const DARK  = { r: 15,  g: 23,  b: 42  };
const MID   = { r: 30,  g: 41,  b: 59  };
const GREEN = { r: 34,  g: 197, b: 94  };
const AMBER = { r: 234, g: 179, b: 8   };
const RED   = { r: 239, g: 68,  b: 68  };

function addPageBackground(doc: jsPDF) {
  const { width, height } = doc.internal.pageSize;
  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.rect(0, 0, width, height, "F");
}

function addHeader(doc: jsPDF, title: string, pageLabel: string) {
  const { width } = doc.internal.pageSize;
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, width, 8, "F");
  doc.setFillColor(MID.r, MID.g, MID.b);
  doc.roundedRect(14, 14, 46, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("Hybrid XGBoost+LSTM", 18, 22);
  doc.setTextColor(255, 255, 255);
  doc.text("Forecaster Platform", 18, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 68, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 163, 175);
  const today = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });
  doc.text(today, 68, 28);
  doc.text(pageLabel, width - 14, 22, { align: "right" });
}

function addFooter(doc: jsPDF) {
  const { width, height } = doc.internal.pageSize;
  doc.setFillColor(MID.r, MID.g, MID.b);
  doc.rect(0, height - 12, width, 12, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 163, 175);
  doc.text(
    "Confidential · Hybrid XGBoost-LSTM Forecaster · AI-powered demand & price intelligence",
    width / 2,
    height - 4,
    { align: "center" }
  );
}

function addSectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(14, y, 3, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(text, 20, y + 5.5);
  return y + 14;
}

function kpiCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
  sub?: string, accent?: { r: number; g: number; b: number }
) {
  doc.setFillColor(MID.r, MID.g, MID.b);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  if (accent) {
    doc.setFillColor(accent.r, accent.g, accent.b);
    doc.rect(x, y, 3, h, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 163, 175);
  doc.text(label.toUpperCase(), x + 6, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(value, x + 6, y + 18);
  if (sub) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 163, 175);
    doc.text(sub, x + 6, y + 25);
  }
}

export function generatePdfReport(forecast: ForecastResult): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.width;

  // PAGE 1 — Cover + KPI Summary
  addPageBackground(doc);
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, W, 8, "F");
  doc.setFillColor(MID.r, MID.g, MID.b);
  doc.roundedRect(0, 8, W, 75, 0, 0, "F");

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.roundedRect(14, 18, 55, 16, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("HYBRID XGBOOST + LSTM FORECASTER", 18, 27);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Powered Demand & Price Intelligence Platform", 18, 31);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Executive Board Report", 14, 58);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(150, 163, 175);
  const generatedDate = new Date(forecast.generatedAt).toLocaleDateString("en-IN", { dateStyle: "full" });
  doc.text(`Forecast Period: ${forecast.horizonDays} days  |  Generated: ${generatedDate}`, 14, 67);

  // Compute KPIs
  const kpis = deriveKpis(forecast);
  const inventory = deriveInventory(forecast);

  const annualRevenue = inventory.reduce((sum, item) => sum + item.avgDailyDemand * 365 * item.unitPrice, 0);
  const monthlyRevenue = annualRevenue / 12;
  const totalUnitsHorizon = forecast.products.reduce((sum, p) => {
    const pts = p.series.filter(pt => pt.actual_quantity === null && (pt.predicted_quantity != null || pt.hybrid != null));
    return sum + pts.reduce((s, pt) => s + (((pt.predicted_quantity ?? pt.hybrid) as number) || 0), 0);
  }, 0);
  const avgPrices = forecast.products.flatMap(p =>
    p.history.map(h => h.price).filter((v): v is number => Number.isFinite(v))
  );
  const avgPrice = avgPrices.length ? mean(avgPrices) : 150;
  const accuracy = parseFloat(kpis?.avgAccuracy ?? "0");

  // KPI cards row 1
  const cardY = 92;
  const cardW = (W - 28 - 9) / 4;
  kpiCard(doc, 14,                   cardY, cardW, 32, "Annual Revenue",   fmtRs(annualRevenue),  "Projected total",   BRAND);
  kpiCard(doc, 14 + cardW + 3,       cardY, cardW, 32, "Monthly Revenue",  fmtRs(monthlyRevenue), "Per month avg",     GREEN);
  kpiCard(doc, 14 + (cardW + 3) * 2, cardY, cardW, 32, "Forecast Horizon", `${forecast.horizonDays} Days`, "Future period", AMBER);
  kpiCard(doc, 14 + (cardW + 3) * 3, cardY, cardW, 32, "Model Accuracy",   `${accuracy.toFixed(1)}%`, "Hybrid ensemble", { r: 168, g: 85, b: 247 });

  // KPI cards row 2
  const cardY2 = cardY + 38;
  const cardW2 = (W - 28 - 6) / 3;
  kpiCard(doc, 14,              cardY2, cardW2, 28, "Products Tracked", String(forecast.products.length), "SKUs in model", BRAND);
  kpiCard(doc, 14 + cardW2 + 3, cardY2, cardW2, 28, "Avg Unit Price",   fmtRs(avgPrice), "Historical mean", GREEN);
  kpiCard(doc, 14 + (cardW2 + 3) * 2, cardY2, cardW2, 28, "Forecast Units", fmt(Math.round(totalUnitsHorizon)), `Next ${forecast.horizonDays} days`, AMBER);

  // Revenue calculation explanation
  const calcY = cardY2 + 36;
  doc.setFillColor(MID.r, MID.g, MID.b);
  doc.roundedRect(14, calcY, W - 28, 42, 2, 2, "F");
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(14, calcY, 3, 42, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("How Annual Revenue is Calculated", 20, calcY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 220);
  doc.text(
    `Annual Revenue = Sum over all ${forecast.products.length} products of (Avg Daily Demand x 365 x Unit Price)`,
    20, calcY + 16
  );
  doc.setTextColor(150, 163, 175);
  doc.setFontSize(7.5);
  doc.text("• Avg Daily Demand: 70% LSTM forecast + 30% historical average (blended)", 20, calcY + 23);
  doc.text("• Unit Price: last recorded price per product from your uploaded dataset",  20, calcY + 30);
  doc.text("• Forward projection — actual revenue depends on real-world market conditions", 20, calcY + 37);

  addFooter(doc);

  // PAGE 2 — Product Forecast Table
  doc.addPage();
  addPageBackground(doc);
  addHeader(doc, "Sales Forecast by Product", "Page 2 of 4");

  let curY = 42;
  curY = addSectionTitle(doc, `Demand & Revenue Forecast per SKU — Next ${forecast.horizonDays} Days`, curY);

  const productRows = forecast.products.map(p => {
    const inv = inventory.find(i => i.product === p.product);
    const pts = p.series.filter(pt => pt.actual_quantity === null && (pt.predicted_quantity != null || pt.hybrid != null));
    const forecastTotal = pts.reduce((s, pt) => s + (((pt.predicted_quantity ?? pt.hybrid) as number) || 0), 0);
    const histAvg = p.history.length ? mean(p.history.map(h => h.sales)) : 0;
    const lastPrice = p.history[p.history.length - 1]?.price ?? inv?.unitPrice ?? 150;
    const projRevenue = forecastTotal * lastPrice;
    const mape = p.metrics_quantity?.mape ?? p.metrics?.mape;
    const accuracyVal = mape != null ? Math.max(0, Math.min(100, 100 - mape)) : 85.0;
    const accuracyStr = `${accuracyVal.toFixed(1)}%`;
    const statusLabel = inv?.status === "out_of_stock" ? "OUT OF STOCK"
      : inv?.status === "critical" ? "CRITICAL"
      : inv?.status === "warning" ? "WARNING"
      : "HEALTHY";
    return [
      p.product.length > 22 ? p.product.slice(0, 20) + "…" : p.product,
      fmt(Math.round(histAvg), 0) + "/day",
      fmt(Math.round(forecastTotal)),
      fmtRs(lastPrice),
      fmtRs(projRevenue),
      accuracyStr,
      statusLabel,
    ];
  });

  autoTable(doc, {
    startY: curY,
    head: [["Product", "Hist Avg", "Forecast Units", "Unit Price", "Proj. Revenue", "Accuracy", "Stock"]],
    body: productRows,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8, textColor: [220, 228, 240], fillColor: [MID.r, MID.g, MID.b], lineColor: [50, 65, 80], lineWidth: 0.3, cellPadding: 3 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [22, 32, 48] },
    columnStyles: { 4: { fontStyle: "bold", textColor: [52, 211, 153] } },
    didParseCell: (data) => {
      if (data.column.index === 6 && data.section === "body") {
        const v = data.cell.raw as string;
        if (v === "CRITICAL" || v === "OUT OF STOCK") data.cell.styles.textColor = [RED.r, RED.g, RED.b];
        else if (v === "WARNING") data.cell.styles.textColor = [AMBER.r, AMBER.g, AMBER.b];
        else data.cell.styles.textColor = [GREEN.r, GREEN.g, GREEN.b];
      }
    },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);

  // PAGE 3 — Inventory Intelligence
  doc.addPage();
  addPageBackground(doc);
  addHeader(doc, "Inventory Intelligence", "Page 3 of 4");

  curY = 42;
  curY = addSectionTitle(doc, "Inventory Optimization — EOQ & Reorder Points", curY);

  const invRows = inventory.map(item => [
    item.product.length > 22 ? item.product.slice(0, 20) + "…" : item.product,
    fmt(item.currentStock),
    fmt(item.rop),
    fmt(item.eoq),
    fmt(item.safetyStock),
    item.avgDailyDemand.toFixed(1),
    item.daysOfCover.toFixed(0) + "d",
    item.stockoutRisk.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: curY,
    head: [["Product", "Stock", "ROP", "EOQ", "Safety Stock", "Daily Demand", "Days Cover", "Risk"]],
    body: invRows,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8, textColor: [220, 228, 240], fillColor: [MID.r, MID.g, MID.b], lineColor: [50, 65, 80], lineWidth: 0.3, cellPadding: 3 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [22, 32, 48] },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.section === "body") {
        const v = data.cell.raw as string;
        if (v === "HIGH") data.cell.styles.textColor = [RED.r, RED.g, RED.b];
        else if (v === "MEDIUM") data.cell.styles.textColor = [AMBER.r, AMBER.g, AMBER.b];
        else data.cell.styles.textColor = [GREEN.r, GREEN.g, GREEN.b];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Inventory KPI summary below table
  type DocWithLastTable = jsPDF & { lastAutoTable: { finalY: number } };
  const afterInvY = (doc as DocWithLastTable).lastAutoTable.finalY + 10;
  const critCount = inventory.filter(i => i.status === "critical" || i.status === "out_of_stock").length;
  const warnCount = inventory.filter(i => i.status === "warning").length;
  const totalReorderValue = inventory
    .filter(i => i.status !== "healthy")
    .reduce((s, i) => s + i.reorderQty * i.unitPrice, 0);

  const iW = (W - 28 - 6) / 3;
  kpiCard(doc, 14,           afterInvY, iW, 26, "Critical Alerts",   String(critCount),          "Immediate action", RED);
  kpiCard(doc, 14 + iW + 3,  afterInvY, iW, 26, "Warning Alerts",    String(warnCount),          "Monitor closely", AMBER);
  kpiCard(doc, 14 + (iW + 3) * 2, afterInvY, iW, 26, "Est. Reorder Value", fmtRs(totalReorderValue), "To restore levels", BRAND);

  addFooter(doc);

  // PAGE 4 — Model Performance
  doc.addPage();
  addPageBackground(doc);
  addHeader(doc, "Model Performance & Methodology", "Page 4 of 4");

  curY = 42;
  curY = addSectionTitle(doc, "Quantity Forecast — Model Comparison (MAE / RMSE / MAPE / R²)", curY);

  const qtyModels = deriveModelComparison(forecast, "quantity");
  autoTable(doc, {
    startY: curY,
    head: [["Model", "MAE", "RMSE", "MAPE", "R²", "Train Time"]],
    body: qtyModels.map(m => [m.model, fmt(m.mae, 2), fmt(m.rmse, 2), m.mape.toFixed(2) + "%", m.r2.toFixed(3), m.trainTime]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, textColor: [220, 228, 240], fillColor: [MID.r, MID.g, MID.b], lineColor: [50, 65, 80], lineWidth: 0.3, cellPadding: 4 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [22, 32, 48] },
    didParseCell: (data) => {
      if (data.row.index === 2 && data.section === "body") data.cell.styles.textColor = [52, 211, 153];
    },
    margin: { left: 14, right: 14 },
  });

  const afterQtyY = (doc as DocWithLastTable).lastAutoTable.finalY + 10;
  curY = addSectionTitle(doc, "Price Forecast — Model Comparison (MAE / RMSE / MAPE / R²)", afterQtyY);

  const priceModels = deriveModelComparison(forecast, "price");
  autoTable(doc, {
    startY: curY,
    head: [["Model", "MAE", "RMSE", "MAPE", "R²", "Train Time"]],
    body: priceModels.map(m => [m.model, fmt(m.mae, 2), fmt(m.rmse, 2), m.mape.toFixed(2) + "%", m.r2.toFixed(3), m.trainTime]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, textColor: [220, 228, 240], fillColor: [MID.r, MID.g, MID.b], lineColor: [50, 65, 80], lineWidth: 0.3, cellPadding: 4 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [22, 32, 48] },
    didParseCell: (data) => {
      if (data.row.index === 2 && data.section === "body") data.cell.styles.textColor = [52, 211, 153];
    },
    margin: { left: 14, right: 14 },
  });

  // Methodology box
  const afterPriceY = (doc as DocWithLastTable).lastAutoTable.finalY + 10;
  doc.setFillColor(MID.r, MID.g, MID.b);
  doc.roundedRect(14, afterPriceY, W - 28, 52, 2, 2, "F");
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(14, afterPriceY, 3, 52, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("Methodology Overview", 20, afterPriceY + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 210, 220);
  const notes = [
    "XGBoost: Gradient-boosted trees on lagged sales, rolling 7/14/30-day means, day-of-week and month indicators.",
    "LSTM: Multi-output sequence-to-sequence RNN; requires 35+ unique daily observations per product.",
    "Hybrid Ensemble: Meta-learner combines XGBoost + LSTM predictions for lower variance and higher accuracy.",
    "Inventory: EOQ formula with Safety Stock at 95% service level (z=1.645) and 7-day default lead time.",
    "Annual Revenue: Blended demand (70% LSTM + 30% historical) x 365 x last recorded unit price per SKU.",
  ];
  notes.forEach((n, i) => doc.text(`• ${n}`, 20, afterPriceY + 18 + i * 7));

  addFooter(doc);

  // Save
  const filename = `board-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
