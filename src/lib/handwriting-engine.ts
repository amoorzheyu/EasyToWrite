import type { HandwritingParams } from "@/types";

/** seeded pseudo-random (mulberry32) 保证相同参数生成相同结果 */
function createRng(seed: number) {
  let s = seed | 0;
  return function () {
    s = Math.imul(48271, s) | 0;
    const t = (s >>> 0) / 2147483648;
    return t * 2 - 1; // [-1, 1]
  };
}

/** thickness (0.5~3.0) 映射到 CSS font-weight */
function thicknessToWeight(t: number): number {
  const w = Math.round((100 + (t - 0.5) / 2.5 * 800) / 100) * 100;
  return Math.min(900, Math.max(100, w));
}

interface RenderOptions {
  text: string;
  params: HandwritingParams;
  width: number;
  height: number;
  /** 渲染分辨率倍数，导出时传 2，预览时传 1 */
  pixelRatio?: number;
}

/**
 * 在离屏 canvas 上渲染手写文字，返回 canvas 元素
 */
export function renderHandwriting(options: RenderOptions): HTMLCanvasElement {
  const { text, params, width, height, pixelRatio = 1 } = options;
  const {
    fontFamily,
    fontSize,
    color,
    thickness,
    spacing,
    looseness,
    messiness,
    verticalFloat,
  } = params;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(pixelRatio, pixelRatio);

  const fontWeight = thicknessToWeight(thickness);
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", cursive`;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";

  const rng = createRng(text.length * 137 + fontSize * 31);

  const lineHeight = fontSize * 1.5;
  const paddingH = fontSize * 0.4;
  const paddingV = fontSize * 0.5;
  const maxLineWidth = width - paddingH * 2;

  /** 将文本按自动换行分成行数组 */
  const lines: string[] = [];
  let currentLine = "";
  let currentWidth = 0;

  for (const char of text) {
    if (char === "\n") {
      lines.push(currentLine);
      currentLine = "";
      currentWidth = 0;
      continue;
    }
    const charMetrics = ctx.measureText(char);
    const charW = charMetrics.width * spacing;
    if (currentWidth + charW > maxLineWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
      currentWidth = charW;
    } else {
      currentLine += char;
      currentWidth += charW;
    }
  }
  if (currentLine) lines.push(currentLine);

  lines.forEach((line, lineIdx) => {
    const baseline = paddingV + fontSize + lineIdx * lineHeight;
    if (baseline > height - paddingV * 0.5) return; // 超出区域不渲染

    let x = paddingH;

    for (const char of line) {
      const r = rng;
      const rotation = r() * messiness * (8 * Math.PI / 180);
      const yOffset = r() * verticalFloat * fontSize * 0.15;
      const xJitter = r() * looseness * fontSize * 0.06;
      const sizeVariant = 1 + r() * looseness * 0.08;

      ctx.save();
      ctx.translate(x + xJitter, baseline + yOffset);
      ctx.rotate(rotation);
      ctx.scale(sizeVariant, 1);

      // 高潦草时叠加轻微字形模糊抖动
      if (messiness > 0.5) {
        ctx.shadowColor = color;
        ctx.shadowBlur = messiness * 0.6;
      }

      ctx.font = `${fontWeight} ${Math.round(fontSize * sizeVariant)}px "${fontFamily}", cursive`;
      ctx.fillText(char, 0, 0);
      ctx.restore();

      const charW = ctx.measureText(char).width;
      x += charW * spacing + xJitter * 0.3;
    }
  });

  return canvas;
}

/**
 * 渲染并转换为 dataURL（用于 Fabric.js 图像对象显示）
 */
export function renderHandwritingToDataUrl(options: RenderOptions): string {
  const canvas = renderHandwriting(options);
  return canvas.toDataURL("image/png");
}

/**
 * 渲染并转换为 Uint8Array（用于 pdf-lib 嵌入）
 */
export async function renderHandwritingToPngBytes(
  options: RenderOptions
): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const canvas = renderHandwriting({ ...options, pixelRatio: options.pixelRatio ?? 2 });
    canvas.toBlob((blob) => {
      blob!.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
    }, "image/png");
  });
}
