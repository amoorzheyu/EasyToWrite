import type { PageDimension } from "@/types";

/**
 * 将屏幕 CSS 像素坐标转换为 PDF 点坐标
 * PDF 坐标原点在页面左下角，Y 轴向上
 * 浏览器坐标原点在左上角，Y 轴向下
 */
export function screenToPdf(
  screenX: number,
  screenY: number,
  page: PageDimension
): { pdfX: number; pdfY: number } {
  const ratio = page.pdfWidth / page.cssWidth;
  const pdfX = screenX * ratio;
  const pdfY = page.pdfHeight - screenY * ratio;
  return { pdfX, pdfY };
}

/**
 * 将 PDF 点坐标转换为屏幕 CSS 像素坐标
 */
export function pdfToScreen(
  pdfX: number,
  pdfY: number,
  page: PageDimension
): { screenX: number; screenY: number } {
  const ratio = page.cssWidth / page.pdfWidth;
  const screenX = pdfX * ratio;
  const screenY = (page.pdfHeight - pdfY) * ratio;
  return { screenX, screenY };
}

/**
 * 将 Fabric.js 中矩形对象的 CSS 像素坐标（含 pageOffset）
 * 转换为 PDF 点坐标，返回用于 TextRegion 的 pdfX/pdfY/pdfWidth/pdfHeight
 */
export function fabricRectToPdfCoords(
  rectLeft: number,
  rectTop: number,
  rectWidth: number,
  rectHeight: number,
  page: PageDimension
): { pdfX: number; pdfY: number; pdfWidth: number; pdfHeight: number } {
  const ratio = page.pdfWidth / page.cssWidth;
  const pdfX = rectLeft * ratio;
  const pdfY = page.pdfHeight - (rectTop + rectHeight) * ratio;
  const pdfWidth = rectWidth * ratio;
  const pdfHeight = rectHeight * ratio;
  return { pdfX, pdfY, pdfWidth, pdfHeight };
}

/**
 * 将 PDF 点坐标的矩形转换回 CSS 像素坐标（用于在 canvas 上绘制）
 */
export function pdfRectToScreenCoords(
  pdfX: number,
  pdfY: number,
  pdfWidth: number,
  pdfHeight: number,
  page: PageDimension
): { left: number; top: number; width: number; height: number } {
  const ratio = page.cssWidth / page.pdfWidth;
  const left = pdfX * ratio;
  const top = (page.pdfHeight - pdfY - pdfHeight) * ratio;
  const width = pdfWidth * ratio;
  const height = pdfHeight * ratio;
  return { left, top, width, height };
}
