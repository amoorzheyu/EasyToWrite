"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { TextRegion, HandwritingParams, FontMeta } from "@/types";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { renderHandwritingToDataUrl } from "@/lib/handwriting-engine";
import { Trash2, MousePointer, FileText, ChevronRight, Pencil, Check, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertiesPanelProps {
  region: TextRegion | null;
  regions?: TextRegion[];
  fonts?: FontMeta[];
  fontsLoaded?: boolean;
  fontsError?: string | null;
  onSelectRegion?: (id: string) => void;
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
  regions = [],
  fonts = [],
  fontsLoaded = false,
  fontsError = null,
  onSelectRegion,
  onUpdateRegion,
  onDeleteRegion,
}: PropertiesPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const updatePreview = useCallback((r: TextRegion) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      if (!r.text.trim()) {
        setPreviewUrl("");
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const url = renderHandwritingToDataUrl({
        text: r.text,
        params: r.params,
        width: 240,
        height: 80,
        pixelRatio: dpr,
      });
      setPreviewUrl(url);
    }, 80);
  }, []);

  useEffect(() => {
    if (region) updatePreview(region);
    else setPreviewUrl("");
  }, [region, updatePreview]);

  useEffect(() => {
    if (region) {
      setNameInput(region.name ?? "");
      setEditingName(false);
    }
  }, [region?.id]);

  const startEditName = () => {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const commitName = () => {
    if (region) {
      onUpdateRegion(region.id, { name: nameInput.trim() || undefined });
    }
    setEditingName(false);
  };

  if (!region) {
    if (regions.length > 0) {
      return (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">修改列表</span>
            <span className="ml-2 text-xs text-slate-400">{regions.length} 个区域</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {regions.map((r, index) => (
              <button
                key={r.id}
                onClick={() => onSelectRegion?.(r.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="w-7 h-7 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-600 truncate">
                    {r.name?.trim() ? r.name.trim() : `区域 ${index + 1}`}
                    <span className="ml-1.5 text-slate-400 font-normal">第 {r.pageIndex} 页</span>
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {r.text.trim() ? r.text.trim() : <span className="italic">暂无文字内容</span>}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">点击区域以编辑内容与手写风格</p>
          </div>
        </div>
      );
    }

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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                placeholder="输入区域名称…"
                className="flex-1 min-w-0 text-sm font-semibold text-slate-700 bg-transparent border-b border-indigo-400 outline-none placeholder:font-normal placeholder:text-slate-400"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); commitName(); }}
                className="text-indigo-500 hover:text-indigo-700 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={startEditName}
              className="group flex items-center gap-1.5 max-w-full"
              title="点击重命名"
            >
              <span className="text-sm font-semibold text-slate-700 truncate">
                {region.name?.trim() || "未命名区域"}
              </span>
              <Pencil className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
            </button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
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
          {!fontsLoaded ? (
            <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              正在加载字体…
            </div>
          ) : fontsError ? (
            <div className="flex items-start gap-2 py-2 px-2.5 rounded-lg bg-red-50 border border-red-100">
              <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-500 leading-relaxed">
                无法连接字体服务<br />
                <span className="text-red-400">{fontsError}</span>
              </p>
            </div>
          ) : fonts.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">暂无可用字体，请在后端 fonts/ 目录添加字体文件</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {fonts.map((font) => (
                <button
                  key={font.id}
                  onClick={() => patchParams({ fontFamily: font.fontFamily })}
                  className={cn(
                    "text-left px-2.5 py-2 rounded-lg border text-xs transition-all",
                    params.fontFamily === font.fontFamily
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  )}
                  style={{ fontFamily: `"${font.fontFamily}", cursive` }}
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
          )}
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
