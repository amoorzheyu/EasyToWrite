"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { TextRegion, PageDimension } from "@/types";
import { retrievePdf } from "@/lib/pdf-store";
import { useFonts } from "@/lib/use-fonts";
import { exportPdfWithHandwriting, downloadUint8ArrayAsPdf } from "@/lib/pdf-export";
import PropertiesPanel from "@/components/PropertiesPanel";
import type { FabricCanvasHandle } from "@/components/FabricCanvas";
import {
  Pen,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 动态加载含 canvas 的组件，禁止 SSR
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), { ssr: false });
const FabricCanvas = dynamic(
  () => import("@/components/FabricCanvas"),
  { ssr: false }
);

export default function EditorPage() {
  const router = useRouter();
  const fabricRef = useRef<FabricCanvasHandle>(null);

  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [filename, setFilename] = useState("document.pdf");
  const [pageDimensions, setPageDimensions] = useState<PageDimension[]>([]);
  const [regions, setRegions] = useState<TextRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1.2);
  const [exporting, setExporting] = useState(false);
  const { fonts, fontsLoaded, error: fontsError } = useFonts();

  // 从 sessionStorage 读取 PDF
  useEffect(() => {
    const stored = retrievePdf();
    if (!stored) {
      router.replace("/");
      return;
    }
    setPdfBytes(stored.bytes);
    setFilename(stored.filename);
  }, [router]);

  const selectedRegion = regions.find((r) => r.id === selectedId) ?? null;

  const handlePagesReady = useCallback((dims: PageDimension[]) => {
    setPageDimensions(dims);
  }, []);

  const handleAddRegion = useCallback((region: TextRegion) => {
    setRegions((prev) => [...prev, region]);
    setSelectedId(region.id);
  }, []);

  const handleUpdateRegionPosition = useCallback(
    (id: string, pdfX: number, pdfY: number, pdfWidth: number, pdfHeight: number) => {
      setRegions((prev) =>
        prev.map((r) => (r.id === id ? { ...r, pdfX, pdfY, pdfWidth, pdfHeight } : r))
      );
    },
    []
  );

  const handleUpdateRegion = useCallback(
    (id: string, patch: Partial<Omit<TextRegion, "id">>) => {
      setRegions((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    },
    []
  );

  const handleDeleteRegion = useCallback((id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const handleDeleteSelected = () => {
    fabricRef.current?.deleteSelected();
  };

  const handleExport = async () => {
    if (!pdfBytes) return;
    setExporting(true);
    try {
      const result = await exportPdfWithHandwriting(pdfBytes, regions, pageDimensions);
      const exportName = filename.replace(/\.pdf$/i, "") + "_手写注释.pdf";
      downloadUint8ArrayAsPdf(result, exportName);
    } catch (e) {
      console.error("导出失败", e);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const totalWidth = pageDimensions.length
    ? Math.max(...pageDimensions.map((p) => p.cssWidth))
    : 0;
  const totalHeight = pageDimensions.reduce((acc, p) => acc + p.cssHeight + 16, 0);

  if (!pdfBytes) {
    return (
      <div className="flex items-center justify-center h-screen gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>正在加载…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* 顶部工具栏 */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-slate-500"
          onClick={() => router.push("/")}
          title="返回上传页"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center">
            <Pen className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-700 max-w-[180px] truncate">
            {filename}
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* 缩放控制 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(1)))}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs tabular-nums w-10 text-center text-slate-600">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setScale((s) => Math.min(3, +(s + 0.1).toFixed(1)))}
            disabled={scale >= 3}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* 区域计数 */}
        <span className="text-xs text-slate-500">
          {regions.length} 个区域
        </span>

        {selectedId && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 gap-1.5"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除选中
          </Button>
        )}

        <div className="flex-1" />

        <Button
          onClick={handleExport}
          disabled={exporting || regions.length === 0}
          className="gap-2 h-9"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? "导出中…" : "导出 PDF"}
        </Button>
      </header>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF + 画布区域 */}
        <div className="flex-1 overflow-auto bg-slate-200/80 relative">
          <div
            className="relative mx-auto my-4"
            style={{
              width: totalWidth || "100%",
              minHeight: totalHeight || "100%",
            }}
          >
            {/* PDF 渲染层 */}
            <PDFViewer
              pdfBytes={pdfBytes}
              scale={scale}
              onPagesReady={handlePagesReady}
            />

            {/* Fabric.js 交互层（仅在页面尺寸就绪后挂载） */}
            {pageDimensions.length > 0 && (
              <div
                className="absolute inset-0"
                style={{ width: totalWidth, height: totalHeight }}
              >
                <FabricCanvas
                  canvasRef={fabricRef}
                  pageDimensions={pageDimensions}
                  regions={regions}
                  selectedRegionId={selectedId}
                  onSelectRegion={setSelectedId}
                  onAddRegion={handleAddRegion}
                  onUpdateRegionPosition={handleUpdateRegionPosition}
                  onDeleteRegion={handleDeleteRegion}
                />
              </div>
            )}
          </div>

          {/* 使用提示 */}
          {pageDimensions.length > 0 && regions.length === 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 text-white text-xs px-4 py-2 rounded-full shadow-lg pointer-events-none backdrop-blur-sm">
              在 PDF 上拖拽即可创建手写区域
            </div>
          )}
        </div>

        {/* 右侧属性面板 */}
        <aside
          className={cn(
            "w-72 bg-white border-l border-slate-200 shrink-0 flex flex-col transition-all duration-200",
            selectedId ? "shadow-[-4px_0_12px_rgba(0,0,0,0.05)]" : ""
          )}
        >
          <PropertiesPanel
            region={selectedRegion}
            regions={regions}
            fonts={fonts}
            fontsLoaded={fontsLoaded}
            fontsError={fontsError}
            onSelectRegion={setSelectedId}
            onUpdateRegion={handleUpdateRegion}
            onDeleteRegion={handleDeleteRegion}
          />
        </aside>
      </div>
    </div>
  );
}
