"use client";

import { useState, useEffect } from "react";
import type { FontMeta } from "@/types";

const BACKEND_BASE = process.env.NEXT_PUBLIC_FONT_API_BASE ?? "http://localhost:8000";

export interface UseFontsResult {
  fonts: FontMeta[];
  fontsLoaded: boolean;
  error: string | null;
}

/**
 * 从后端获取字体列表，并通过 FontFace API 将每个字体注册到浏览器，
 * 确保 Canvas 渲染前字体已就绪。
 */
export function useFonts(): UseFontsResult {
  const [fonts, setFonts] = useState<FontMeta[]>([]);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFonts() {
      try {
        const res = await fetch(`${BACKEND_BASE}/api/fonts`);
        if (!res.ok) throw new Error(`获取字体列表失败: ${res.status}`);
        const list: FontMeta[] = await res.json();

        if (cancelled) return;

        // 并行加载所有字体
        await Promise.all(
          list.map(async (meta) => {
            const url = `${BACKEND_BASE}/api/fonts/file/${encodeURIComponent(meta.file)}`;
            const face = new FontFace(meta.fontFamily, `url(${url})`);
            try {
              const loaded = await face.load();
              document.fonts.add(loaded);
            } catch (e) {
              console.warn(`字体加载失败: ${meta.label} (${meta.file})`, e);
            }
          })
        );

        if (cancelled) return;
        setFonts(list);
        setFontsLoaded(true);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "后端连接失败";
        console.error("[useFonts]", msg);
        setError(msg);
        setFontsLoaded(true); // 即使失败也解除加载阻塞，避免页面卡死
      }
    }

    loadFonts();
    return () => { cancelled = true; };
  }, []);

  return { fonts, fontsLoaded, error };
}
