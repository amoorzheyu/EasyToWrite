"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PageDimension } from "@/types";

interface PDFViewerProps {
  pdfBytes: ArrayBuffer;
  scale: number;
  onPagesReady: (dimensions: PageDimension[]) => void;
}

interface RenderedPage {
  pageIndex: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export default function PDFViewer({ pdfBytes, scale, onPagesReady }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const renderPdf = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;

      const renderedPages: RenderedPage[] = [];
      const dimensions: PageDimension[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const cssWidth = viewport.width / dpr;
        const cssHeight = viewport.height / dpr;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        renderedPages.push({
          pageIndex: i,
          canvas,
          width: cssWidth,
          height: cssHeight,
        });

        const origViewport = page.getViewport({ scale: 1 });
        dimensions.push({
          pageIndex: i,
          pdfWidth: origViewport.width,
          pdfHeight: origViewport.height,
          cssWidth,
          cssHeight,
          scale: scale * dpr,
        });
      }

      setPages(renderedPages);
      onPagesReady(dimensions);
    } catch (e) {
      console.error(e);
      setError("PDF 解析失败，请检查文件是否损坏");
    } finally {
      setLoading(false);
    }
  }, [pdfBytes, scale, onPagesReady]);

  useEffect(() => {
    renderPdf();
  }, [renderPdf]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">正在渲染 PDF…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-40 text-red-500 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 py-4">
      {pages.map((p) => (
        <div
          key={p.pageIndex}
          data-page-index={p.pageIndex}
          className="relative shadow-md"
          style={{ width: p.width, height: p.height }}
        >
          {/* PDF canvas 通过 ref 挂载 */}
          <CanvasMount canvas={p.canvas} width={p.width} height={p.height} />
        </div>
      ))}
    </div>
  );
}

function CanvasMount({
  canvas,
  width,
  height,
}: {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    el.appendChild(canvas);
    return () => {
      if (el.contains(canvas)) el.removeChild(canvas);
    };
  }, [canvas, width, height]);

  return (
    <div
      ref={ref}
      style={{ width, height }}
      className="absolute inset-0"
    />
  );
}
