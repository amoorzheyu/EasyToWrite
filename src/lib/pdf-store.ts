/**
 * 利用 sessionStorage 在上传页和编辑器页之间传递 PDF 数据
 * 大文件时改用 IndexedDB，此处为简化实现
 */

const PDF_KEY = "etw_pdf_bytes";
const PDF_NAME_KEY = "etw_pdf_name";

export function storePdf(bytes: ArrayBuffer, filename: string) {
  const base64 = arrayBufferToBase64(bytes);
  sessionStorage.setItem(PDF_KEY, base64);
  sessionStorage.setItem(PDF_NAME_KEY, filename);
}

export function retrievePdf(): { bytes: ArrayBuffer; filename: string } | null {
  const base64 = sessionStorage.getItem(PDF_KEY);
  const filename = sessionStorage.getItem(PDF_NAME_KEY);
  if (!base64 || !filename) return null;
  return { bytes: base64ToArrayBuffer(base64), filename };
}

export function clearPdf() {
  sessionStorage.removeItem(PDF_KEY);
  sessionStorage.removeItem(PDF_NAME_KEY);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
