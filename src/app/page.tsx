"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Pen, Download, Layers } from "lucide-react";
import { storePdf } from "@/lib/pdf-store";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        setError("请上传 PDF 格式文件");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError("文件大小不能超过 50MB");
        return;
      }
      setError("");
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          storePdf(e.target.result, file.name);
          router.push("/editor");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
          <Pen className="w-4 h-4 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">EasyToWrite</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-12">
        <div className="text-center mb-10 max-w-lg">
          <h1 className="text-4xl font-extrabold text-slate-900 leading-tight mb-3">
            在 PDF 上写下<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
              你的手写笔迹
            </span>
          </h1>
          <p className="text-slate-500 text-base">
            框选区域，填入文字，调整字体与手写风格参数，一键导出带手写内容的 PDF
          </p>
        </div>

        {/* 上传区 */}
        <label
          onDragEnter={() => setDragging(true)}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative w-full max-w-md h-52 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3",
            dragging
              ? "border-indigo-500 bg-indigo-50 scale-[1.02]"
              : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30"
          )}
        >
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={onInputChange}
          />
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
            dragging ? "bg-indigo-100" : "bg-slate-100"
          )}>
            <Upload className={cn("w-7 h-7", dragging ? "text-indigo-600" : "text-slate-400")} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-700">
              {dragging ? "松开即可上传" : "拖拽 PDF 文件到此处"}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">或点击选择文件，最大 50MB</p>
          </div>
          {error && (
            <p className="absolute bottom-3 text-sm text-red-500">{error}</p>
          )}
        </label>

        {/* 特性说明 */}
        <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl w-full">
          {[
            {
              icon: Layers,
              title: "精准框选",
              desc: "在 PDF 任意位置拖拽框选，可叠加多个区域",
            },
            {
              icon: Pen,
              title: "手写模拟",
              desc: "支持 6 种手写字体，可调节潦草度、浮动、间距",
            },
            {
              icon: Download,
              title: "直接导出",
              desc: "一键下载嵌入手写内容的完整 PDF",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        <FileText className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
        文件仅在浏览器本地处理，不会上传到任何服务器
      </footer>
    </div>
  );
}
