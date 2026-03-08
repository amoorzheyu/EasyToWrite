export interface HandwritingParams {
  fontFamily: string;
  fontSize: number;
  color: string;
  /** 笔画粗细倍数 0.5 ~ 3.0 对应 font-weight 100~900 */
  thickness: number;
  /** 字间距倍数 0.8 ~ 2.0 */
  spacing: number;
  /** 松散程度：字符间距随机幅度 0 ~ 1 */
  looseness: number;
  /** 潦草程度：旋转 + 笔画抖动幅度 0 ~ 1 */
  messiness: number;
  /** 上下浮动：基线随机位移幅度 0 ~ 1 */
  verticalFloat: number;
}

export interface TextRegion {
  id: string;
  /** 在对应页面的 PDF 点坐标系中的位置（原点左下角） */
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  /** 该区域所在 PDF 页码（从 1 开始） */
  pageIndex: number;
  text: string;
  params: HandwritingParams;
}

export interface PageDimension {
  pageIndex: number;
  /** PDF 原始宽高（点单位） */
  pdfWidth: number;
  pdfHeight: number;
  /** 当前渲染时的 CSS 像素宽高 */
  cssWidth: number;
  cssHeight: number;
  /** 渲染 scale（含 devicePixelRatio） */
  scale: number;
}

export const HANDWRITING_FONTS: { value: string; label: string; lang: "zh" | "en" }[] = [
  { value: "Ma Shan Zheng", label: "马善政体", lang: "zh" },
  { value: "ZCOOL KuaiLe", label: "站酷快乐体", lang: "zh" },
  { value: "Long Cang", label: "龙藏体", lang: "zh" },
  { value: "Caveat", label: "Caveat", lang: "en" },
  { value: "Kalam", label: "Kalam", lang: "en" },
  { value: "Patrick Hand", label: "Patrick Hand", lang: "en" },
];

export const DEFAULT_PARAMS: HandwritingParams = {
  fontFamily: "Ma Shan Zheng",
  fontSize: 20,
  color: "#1a1a2e",
  thickness: 1,
  spacing: 1.1,
  looseness: 0.3,
  messiness: 0.25,
  verticalFloat: 0.2,
};
