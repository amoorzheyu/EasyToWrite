"use client";

import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { TextRegion, PageDimension } from "@/types";
import { DEFAULT_PARAMS } from "@/types";
import { fabricRectToPdfCoords, pdfRectToScreenCoords } from "@/lib/coordinate-utils";
import { renderHandwritingToDataUrl } from "@/lib/handwriting-engine";

export interface FabricCanvasHandle {
  refreshRegion: (regionId: string) => void;
  deleteSelected: () => void;
}

interface FabricCanvasProps {
  pageDimensions: PageDimension[];
  regions: TextRegion[];
  selectedRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
  onAddRegion: (region: TextRegion) => void;
  onUpdateRegionPosition: (
    id: string,
    pdfX: number,
    pdfY: number,
    pdfWidth: number,
    pdfHeight: number
  ) => void;
  onDeleteRegion: (id: string) => void;
}

const REGION_FILL = "rgba(99,102,241,0.08)";
const REGION_STROKE = "rgba(99,102,241,0.7)";
const REGION_STROKE_SELECTED = "rgba(99,102,241,1)";

const FabricCanvas = forwardRef<FabricCanvasHandle, FabricCanvasProps>(
  (
    {
      pageDimensions,
      regions,
      selectedRegionId,
      onSelectRegion,
      onAddRegion,
      onUpdateRegionPosition,
      onDeleteRegion,
    },
    ref
  ) => {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objectMapRef = useRef<Map<string, any>>(new Map());
    const isDrawingRef = useRef(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drawStartRef = useRef<{ x: number; y: number; rect: any } | null>(null);

    const totalWidth = pageDimensions.length
      ? Math.max(...pageDimensions.map((p) => p.cssWidth))
      : 800;
    const totalHeight = pageDimensions.reduce((acc, p) => acc + p.cssHeight + 16, 0);

    /** 根据 y 位置找到对应页的信息和局部 y 偏移 */
    const getPageAtY = useCallback(
      (y: number): { page: PageDimension; localY: number; pageOffsetY: number } | null => {
        let offsetY = 8;
        for (const page of pageDimensions) {
          if (y >= offsetY && y <= offsetY + page.cssHeight) {
            return { page, localY: y - offsetY, pageOffsetY: offsetY };
          }
          offsetY += page.cssHeight + 16;
        }
        return null;
      },
      [pageDimensions]
    );

    /** 将区域渲染为图像并附加到 fabric 对象 */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attachHandwritingImage = useCallback(async (region: TextRegion, fabricObj: any) => {
      if (!region.text.trim()) {
        fabricObj.set({ opacity: 0.5 });
        fabricRef.current?.renderAll();
        return;
      }
      const dataUrl = renderHandwritingToDataUrl({
        text: region.text,
        params: region.params,
        width: fabricObj.width,
        height: fabricObj.height,
        pixelRatio: window.devicePixelRatio || 1,
      });
      fabricObj.set({ opacity: 1 });
      // 直接在 rect 上设置背景图
      fabricObj.set("_hwDataUrl", dataUrl);
      fabricRef.current?.renderAll();
    }, []);

    /** 初始化 Fabric.js */
    useEffect(() => {
      if (!canvasElRef.current || pageDimensions.length === 0) return;
      let destroyed = false;

      import("fabric").then(({ Canvas, Rect, FabricImage }) => {
        if (destroyed || !canvasElRef.current) return;

        const fc = new Canvas(canvasElRef.current, {
          width: totalWidth,
          height: totalHeight,
          selection: true,
          backgroundColor: "transparent",
        });
        fabricRef.current = fc;

        // 绘图模式：按住拖拽创建新区域
        let originX = 0;
        let originY = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let drawingRect: any = null;

        fc.on("mouse:down", (opt) => {
          const pointer = fc.getPointer(opt.e);
          // 如果点中了已有对象则不创建新区域
          if (opt.target) return;
          isDrawingRef.current = true;
          originX = pointer.x;
          originY = pointer.y;

          drawingRect = new Rect({
            left: originX,
            top: originY,
            width: 0,
            height: 0,
            fill: REGION_FILL,
            stroke: REGION_STROKE,
            strokeWidth: 1.5,
            strokeDashArray: [4, 3],
            selectable: false,
            evented: false,
            rx: 2,
            ry: 2,
          });
          fc.add(drawingRect);
          drawStartRef.current = { x: originX, y: originY, rect: drawingRect };
        });

        fc.on("mouse:move", (opt) => {
          if (!isDrawingRef.current || !drawingRect) return;
          const pointer = fc.getPointer(opt.e);
          const w = pointer.x - originX;
          const h = pointer.y - originY;
          drawingRect.set({
            width: Math.abs(w),
            height: Math.abs(h),
            left: w < 0 ? pointer.x : originX,
            top: h < 0 ? pointer.y : originY,
          });
          fc.renderAll();
        });

        fc.on("mouse:up", (opt) => {
          if (!isDrawingRef.current || !drawingRect) return;
          isDrawingRef.current = false;
          const w = drawingRect.width ?? 0;
          const h = drawingRect.height ?? 0;

          fc.remove(drawingRect);
          drawingRect = null;
          drawStartRef.current = null;

          // 忽略太小的框
          if (w < 20 || h < 20) return;

          const left = drawingRect?.left ?? opt.pointer?.x ?? 0;
          const top = drawingRect?.top ?? opt.pointer?.y ?? 0;

          // 重新读取实际的 left/top（drawingRect 已更新）
          // 此时从 opt 取最终位置
          const finalLeft = w < 0 ? (opt.pointer?.x ?? originX) : originX;
          const finalTop = h < 0 ? (opt.pointer?.y ?? originY) : originY;
          const finalW = Math.abs(w);
          const finalH = Math.abs(h);

          void left; void top;

          const pageInfo = getPageAtY(finalTop + finalH / 2);
          if (!pageInfo) return;

          const { page, pageOffsetY } = pageInfo;
          const localTop = finalTop - pageOffsetY;

          const pdfCoords = fabricRectToPdfCoords(
            finalLeft,
            localTop,
            finalW,
            finalH,
            page
          );

          const newRegion: TextRegion = {
            id: `region_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            pageIndex: page.pageIndex,
            text: "",
            params: { ...DEFAULT_PARAMS },
            ...pdfCoords,
          };

          onAddRegion(newRegion);
        });

        fc.on("selection:created", (opt) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const obj = (opt as any).selected?.[0];
          if (obj?._regionId) onSelectRegion(obj._regionId);
        });

        fc.on("selection:updated", (opt) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const obj = (opt as any).selected?.[0];
          if (obj?._regionId) onSelectRegion(obj._regionId);
        });

        fc.on("selection:cleared", () => {
          onSelectRegion(null);
        });

        fc.on("object:modified", (opt) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const obj = opt.target as any;
          if (!obj?._regionId) return;
          const regionId: string = obj._regionId;
          const pageOffsetY: number = obj._pageOffsetY ?? 0;
          const pageDim: PageDimension = obj._pageDim;
          if (!pageDim) return;

          const coords = fabricRectToPdfCoords(
            obj.left,
            obj.top - pageOffsetY,
            obj.getScaledWidth(),
            obj.getScaledHeight(),
            pageDim
          );
          onUpdateRegionPosition(
            regionId,
            coords.pdfX,
            coords.pdfY,
            coords.pdfWidth,
            coords.pdfHeight
          );
        });

        // 自定义渲染：在 rect 上绘制手写内容图片
        fc.on("after:render", () => {
          const ctx = fc.getContext();
          objectMapRef.current.forEach((obj) => {
            const dataUrl = obj._hwDataUrl;
            if (!dataUrl) return;
            const img = obj._hwImg;
            if (img?.complete) {
              ctx.drawImage(img, obj.left, obj.top, obj.getScaledWidth(), obj.getScaledHeight());
            }
          });
        });

        FabricImage; // 引入但在 after:render 里手动绘制

        return fc;
      });

      return () => {
        destroyed = true;
        fabricRef.current?.dispose();
        fabricRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageDimensions, totalWidth, totalHeight]);

    /** 同步 regions 到 fabric 对象 */
    useEffect(() => {
      const fc = fabricRef.current;
      if (!fc || pageDimensions.length === 0) return;

      import("fabric").then(({ Rect }) => {
        const existingIds = new Set(objectMapRef.current.keys());
        const incomingIds = new Set(regions.map((r) => r.id));

        // 移除已删除的区域
        existingIds.forEach((id) => {
          if (!incomingIds.has(id)) {
            const obj = objectMapRef.current.get(id);
            if (obj) fc.remove(obj);
            objectMapRef.current.delete(id);
          }
        });

        // 添加或更新区域
        regions.forEach((region) => {
          const page = pageDimensions.find((p) => p.pageIndex === region.pageIndex);
          if (!page) return;

          let offsetY = 8;
          for (const p of pageDimensions) {
            if (p.pageIndex === region.pageIndex) break;
            offsetY += p.cssHeight + 16;
          }

          const screenPos = pdfRectToScreenCoords(
            region.pdfX,
            region.pdfY,
            region.pdfWidth,
            region.pdfHeight,
            page
          );

          const isSelected = region.id === selectedRegionId;

          if (objectMapRef.current.has(region.id)) {
            const obj = objectMapRef.current.get(region.id);
            obj.set({
              left: screenPos.left,
              top: screenPos.top + offsetY,
              width: screenPos.width,
              height: screenPos.height,
              stroke: isSelected ? REGION_STROKE_SELECTED : REGION_STROKE,
              strokeWidth: isSelected ? 2 : 1.5,
            });

            // 刷新手写图
            if (region.text.trim()) {
              const dataUrl = renderHandwritingToDataUrl({
                text: region.text,
                params: region.params,
                width: screenPos.width,
                height: screenPos.height,
              });
              const img = new Image();
              img.src = dataUrl;
              img.onload = () => {
                obj._hwImg = img;
                obj._hwDataUrl = dataUrl;
                fc.renderAll();
              };
            } else {
              obj._hwDataUrl = null;
              obj._hwImg = null;
            }
          } else {
            const rect = new Rect({
              left: screenPos.left,
              top: screenPos.top + offsetY,
              width: screenPos.width,
              height: screenPos.height,
              fill: REGION_FILL,
              stroke: isSelected ? REGION_STROKE_SELECTED : REGION_STROKE,
              strokeWidth: isSelected ? 2 : 1.5,
              rx: 2,
              ry: 2,
              hasControls: true,
              lockUniScaling: false,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (rect as any)._regionId = region.id;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (rect as any)._pageOffsetY = offsetY;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (rect as any)._pageDim = page;

            objectMapRef.current.set(region.id, rect);
            fc.add(rect);

            if (region.text.trim()) {
              const dataUrl = renderHandwritingToDataUrl({
                text: region.text,
                params: region.params,
                width: screenPos.width,
                height: screenPos.height,
              });
              const img = new Image();
              img.src = dataUrl;
              img.onload = () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (rect as any)._hwImg = img;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (rect as any)._hwDataUrl = dataUrl;
                fc.renderAll();
              };
            }
          }
        });

        fc.renderAll();
      });
    }, [regions, pageDimensions, selectedRegionId]);

    /** 暴露给父组件的方法 */
    useImperativeHandle(ref, () => ({
      refreshRegion(regionId: string) {
        const fc = fabricRef.current;
        if (!fc) return;
        const region = regions.find((r) => r.id === regionId);
        const obj = objectMapRef.current.get(regionId);
        if (!region || !obj) return;
        attachHandwritingImage(region, obj).then(() => fc.renderAll());
      },
      deleteSelected() {
        const fc = fabricRef.current;
        if (!fc) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const active = fc.getActiveObject() as any;
        if (!active?._regionId) return;
        onDeleteRegion(active._regionId);
        fc.remove(active);
        objectMapRef.current.delete(active._regionId);
        fc.renderAll();
        onSelectRegion(null);
      },
    }));

    return (
      <canvas
        ref={canvasElRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: totalWidth,
          height: totalHeight,
          pointerEvents: "all",
          cursor: "crosshair",
        }}
      />
    );
  }
);

FabricCanvas.displayName = "FabricCanvas";
export default FabricCanvas;
