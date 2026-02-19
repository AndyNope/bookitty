import { createWorker } from 'tesseract.js';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { getDocument } from 'pdfjs-dist';
import type { BookingDraft } from '../types';
import {
  extractPdfText,
  extractPdfTextBlocks,
  parseBlocksToDraft,
  parseTextToDraft,
} from './documentParser';
import { findTemplate } from './templateStore';

const reader = new BrowserMultiFormatReader();

const parseSwissQr = (qrText: string): Partial<BookingDraft> | null => {
  const lines = qrText.split(/\r?\n/).map((line) => line.trim());
  if (!lines[0]?.startsWith('SPC')) return null;

  let amount: number | undefined = lines[18] ? Number(lines[18].replace(',', '.')) : undefined;
  let currency: string | undefined = lines[19] || undefined;

  // Fallback: scan for a currency-code line and treat the line before it as the amount
  if (!Number.isFinite(amount) || !amount || !currency) {
    for (let i = 1; i < lines.length; i++) {
      if (/^(CHF|EUR|USD|GBP)$/.test(lines[i])) {
        const candidate = Number(lines[i - 1]?.replace(',', '.'));
        if (Number.isFinite(candidate) && candidate > 0) {
          amount = candidate;
          currency = lines[i];
          break;
        }
      }
    }
  }

  return {
    amount: Number.isFinite(amount) && (amount ?? 0) > 0 ? amount : undefined,
    currency: currency || undefined,
  };
};

const decodeQrFromImage = async (imageUrl: string) => {
  try {
    const result = await reader.decodeFromImageUrl(imageUrl);
    return result.getText();
  } catch (error) {
    return undefined;
  }
};

const decodeQrFromCanvas = async (canvas: HTMLCanvasElement) => {
  try {
    const result = await reader.decodeFromCanvas(canvas);
    return result.getText();
  } catch {
    return undefined;
  }
};

const decodeQrFromPdf = async (file: File) => {
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport, canvas }).promise;

    const result = await reader.decodeFromCanvas(canvas);
    return result.getText();
  } catch {
    return undefined;
  }
};

const preprocessImage = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  // Scale up small images to improve OCR accuracy
  const scale = bitmap.width < 1400 ? 2 : 1;
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  // Grayscale + contrast boost
  const contrast = 50;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
    imageData.data[i] = gray;
    imageData.data[i + 1] = gray;
    imageData.data[i + 2] = gray;
  }
  context.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
};

const runOcr = async (file: File, preprocessed?: string) => {
  const worker = await createWorker('deu+eng');
  const { data } = await worker.recognize(preprocessed ?? file);
  await worker.terminate();
  return data.text ?? '';
};

export type ProcessedDocument = {
  draft: BookingDraft;
  detection: string;
  templateApplied: boolean;
};

export const processDocument = async (file: File): Promise<ProcessedDocument> => {
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  let detection = 'Standard';
  let text = '';
  let qrText: string | undefined;
  let templateApplied = false;

  if (file.type === 'application/pdf') {
    detection = 'PDF';
    const blocks = await extractPdfTextBlocks(file);
    if (blocks.length) {
      const draft = parseBlocksToDraft(blocks, baseName);
      text = blocks.map((item) => item.str).join(' ');
      qrText = await decodeQrFromPdf(file);
      if (qrText) {
        const qrDraft = parseSwissQr(qrText);
        if (qrDraft?.amount !== undefined) draft.amount = qrDraft.amount;
        if (qrDraft?.currency) draft.currency = qrDraft.currency;
        detection = 'PDF+Layout+QR';
      } else {
        detection = 'PDF+Layout';
      }
      const template = findTemplate(file.name);
      if (template) {
        Object.assign(draft, template.draft);
        detection = `${detection}+Template`;
        templateApplied = true;
      }
      return { draft, detection, templateApplied };
    }
    text = await extractPdfText(file);
    qrText = await decodeQrFromPdf(file);
  } else {
    detection = 'OCR';
    const preprocessed = await preprocessImage(file);
    text = await runOcr(file, preprocessed);
    const imageUrl = URL.createObjectURL(file);
    qrText = await decodeQrFromImage(imageUrl);

    // If QR not found, try at higher scale (small QR codes in full-page A4 images)
    if (!qrText) {
      const bitmap = await createImageBitmap(file);
      for (const scale of [2, 3]) {
        if (qrText) break;
        const scaleCanvas = document.createElement('canvas');
        scaleCanvas.width = bitmap.width * scale;
        scaleCanvas.height = bitmap.height * scale;
        const sCtx = scaleCanvas.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(bitmap, 0, 0, scaleCanvas.width, scaleCanvas.height);
          qrText = await decodeQrFromCanvas(scaleCanvas);
        }
      }
    }

    // Fallback: try from preprocessed (grayscale + contrast) canvas
    if (!qrText && preprocessed) {
      const qrCanvas = document.createElement('canvas');
      const ctx = qrCanvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.src = preprocessed;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });
        qrCanvas.width = img.width;
        qrCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        qrText = await decodeQrFromCanvas(qrCanvas);
      }
    }
    URL.revokeObjectURL(imageUrl);
  }

  const draft = parseTextToDraft(text, baseName);

  if (qrText) {
    const qrDraft = parseSwissQr(qrText);
    if (qrDraft?.amount !== undefined) draft.amount = qrDraft.amount;
    if (qrDraft?.currency) draft.currency = qrDraft.currency;
    detection = detection === 'PDF' ? 'PDF+QR' : 'OCR+QR';
  }

  const template = findTemplate(file.name);
  if (template) {
    Object.assign(draft, template.draft);
    detection = `${detection}+Template`;
    templateApplied = true;
  }

  return { draft, detection, templateApplied };
};
