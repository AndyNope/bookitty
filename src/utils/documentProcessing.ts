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
  const amount = lines[18] ? Number(lines[18].replace(',', '.')) : undefined;
  const currency = lines[19] || undefined;

  return {
    amount: Number.isFinite(amount) ? amount : undefined,
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

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  context.drawImage(bitmap, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
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
