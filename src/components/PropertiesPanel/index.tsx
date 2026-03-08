"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { TextRegion, HandwritingParams } from "@/types";
import { HANDWRITING_FONTS } from "@/types";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { renderHandwritingToDataUrl } from "@/lib/handwriting-engine";
import { Trash2, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertiesPanelProps {
  region: TextRegion | null;
  onUpdateRegion: (id: string, patch: Partial<Omit<TextRegion, "id">>) => void;
  onDeleteRegion: (id: string) => void;
}

const PARAM_CONFIGS: {
  key: keyof Pick<HandwritingParams, "thickness" | "spacing" | "looseness" | "messiness" | "verticalFloat">;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}[] = [
  { key: "thickness", label: "粗细", min: 0.5, max: 3, step: 0.1, format: (v) => `${v.toFixed(1)}x` },
  { key: "spacing", label: "宽距", min: 0.8, max: 2.0, step: 0.05, format: (v) => `${v.toFixed(2)}x` },
  { key: "looseness", label: "松散程度", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "messiness", label: "潦草程度", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "verticalFloat", label: "上下浮动", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
];

export default function PropertiesPanel({
  region,
  onUpdateRegion,
  onDeleteRegion,
}: PropertiesPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePreview = useCallback((r: TextRegion) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      if (!r.text.trim()) {
        setPreviewUrl("");
        return;
      }
      const url = renderHandwritingToDataUrl({
        text: r.text,
        params: r.params,
        width: 240,
        height: 80,
      });
      setPreviewUrl(url);
    }, 80);
  }, []);

  useEffect(() => {
    if (region) updatePreview(region);
    else setPreviewUrl("");
  }, [region, updatePreview]);

  if (!region) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 p-6 text-center">
        <MousePointer className="w-10 h-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">在 PDF 上拖拽框选区域</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          选中区域后可在此处<br />设置文字内容与手写风格
        </p>
      </div>
    );
  }

  const { params } = region;

  const patchParams = (patch: Partial<HandwritingParams>) => {
    const newParams = { ...params, ...patch };
    onUpdateRegion(region.id, { params: newParams });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">文字属性</span>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-red-400 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDeleteRegion(region.id)}
          title="删除区域"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* 文本内容 */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">文字内容</Label>
          <Textarea
            value={region.text}
            onChange={(e) => onUpdateRegion(region.id, { text: e.target.value })}
            placeholder="输入要写入的文字…"
            className="min-h-[90px] text-sm resize-none"
          />
        </div>

        {/* 字体选择 */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">手写字体</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {HANDWRITING_FONTS.map((font) => (
              <button
                key={font.value}
                onClick={() => patchParams({ fontFamily: font.value })}
                className={cn(
                  "text-left px-2.5 py-2 rounded-lg border text-xs transition-all",
                  params.fontFamily === font.value
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                )}
                style={{ fontFamily: `"${font.value}", cursive` }}
              >
                <span className="block text-[15px] leading-tight mb-0.5">
                  {font.lang === "zh" ? "手写示例" : "Handwriting"}
                </span>
                <span className="text-[10px] text-slate-400" style={{ fontFamily: "inherit" }}>
                  {font.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 字号 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-600">字号</Label>
            <span className="text-xs text-slate-400">{params.fontSize}px</span>
          </div>
          <Slider
            min={10}
            max={60}
            step={1}
            value={[params.fontSize]}
            onValueChange={([v]) => patchParams({ fontSize: v })}
          />
        </div>

        {/* 颜色 */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-slate-600">颜色</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={params.color}
              onChange={(e) => patchParams({ color: e.target.value })}
              className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer p-0.5"
            />
            <span className="text-xs font-mono text-slate-400">{params.color}</span>
          </div>
        </div>

        {/* 参数滑块 */}
        {PARAM_CONFIGS.map(({ key, label, min, max, step, format }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-600">{label}</Label>
              <span className="text-xs text-indigo-500 font-medium tabular-nums">
                {format(params[key] as number)}
              </span>
            </div>
            <Slider
              min={min}
              max={max}
              step={step}
              value={[params[key] as number]}
              onValueChange={([v]) => patchParams({ [key]: v })}
            />
          </div>
        ))}

        {/* 实时预览 */}
        {region.text.trim() && (
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">效果预览</Label>
            <div
              className="w-full rounded-lg border border-slate-200 bg-amber-50/60 overflow-hidden"
              style={{ minHeight: 80 }}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="手写预览"
                  className="w-full object-contain"
                  style={{ imageRendering: "crisp-edges" }}
                />
              ) : (
                <div className="h-20 flex items-center justify-center text-xs text-slate-400">
                  渲染中…
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
