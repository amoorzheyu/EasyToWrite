import type { TextRegion, PageDimension } from "@/types";
import { renderHandwritingToPngBytes } from "./handwriting-engine";

export async function exportPdfWithHandwriting(
  originalPdfBytes: ArrayBuffer,
  regions: TextRegion[],
  pageDimensions: PageDimension[]
): Promise<Uint8Array> {
  // 动态引入 pdf-lib 避免 SSR 问题
  const { PDFDocument } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  for (const region of regions) {
    if (!region.text.trim()) continue;

    const pageIdx = region.pageIndex - 1; // 转为 0-based
    const page = pages[pageIdx];
    if (!page) continue;

    const pageDim = pageDimensions.find((p) => p.pageIndex === region.pageIndex);
    if (!pageDim) continue;

    // 高分辨率渲染（2x）
    const pngBytes = await renderHandwritingToPngBytes({
      text: region.text,
      params: region.params,
      width: region.pdfWidth * (pageDim.cssWidth / pageDim.pdfWidth) * 2,
      height: region.pdfHeight * (pageDim.cssWidth / pageDim.pdfWidth) * 2,
      pixelRatio: 1,
    });

    const pngImage = await pdfDoc.embedPng(pngBytes);

    // PDF 坐标原点在左下角
    page.drawImage(pngImage, {
      x: region.pdfX,
      y: region.pdfY,
      width: region.pdfWidth,
      height: region.pdfHeight,
      opacity: 1,
    });
  }

  return pdfDoc.save();
}

export function downloadUint8ArrayAsPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
