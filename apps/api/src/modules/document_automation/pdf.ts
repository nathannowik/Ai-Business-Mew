import PDFDocument from "pdfkit";

/** Render a simple, clean PDF (title + body text) into a Buffer. */
export function renderPdf(params: {
  title: string;
  subtitle?: string;
  content: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).fillColor("#0f172a").text(params.title);
    if (params.subtitle) {
      doc.moveDown(0.2).fontSize(11).fillColor("#64748b").text(params.subtitle);
    }
    doc.moveDown(1).fillColor("#0f172a").fontSize(11).text(params.content, { lineGap: 3 });
    doc.end();
  });
}
