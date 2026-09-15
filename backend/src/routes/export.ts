import express, { Router, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import PptxGenJS from 'pptxgen-js';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { mkdir } from 'fs/promises';

const router = Router();

// Export presentation as PPTX
router.post('/:id/pptx', async (req: AuthRequest, res: Response) => {
  try {
    const { presentation } = req.body;

    if (!presentation) {
      throw new AppError('Presentation data required', 400);
    }

    const prs = new PptxGenJS();
    prs.defineLayout({ name: 'LAYOUT1', width: 10, height: 7.5 });

    // Add slides
    presentation.slides.forEach((slide: any) => {
      const slide_layout = prs.addSlide();

      // Add background color based on style
      slide_layout.background = { color: getBackgroundColor(presentation.style) };

      // Add title
      if (slide.title) {
        slide_layout.addText(slide.title, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 0.8,
          fontSize: 44,
          bold: true,
          color: '000000',
        });
      }

      // Add content
      if (slide.content) {
        slide_layout.addText(slide.content, {
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 5,
          fontSize: 18,
          color: '333333',
        });
      }

      // Add bullet points
      if (slide.bulletPoints && Array.isArray(slide.bulletPoints)) {
        let yPosition = 1.5;
        slide.bulletPoints.forEach((point: string) => {
          slide_layout.addText(`• ${point}`, {
            x: 1,
            y: yPosition,
            w: 8.5,
            h: 0.4,
            fontSize: 16,
            color: '333333',
          });
          yPosition += 0.5;
        });
      }
    });

    // Save PPTX
    const dir = join(process.cwd(), 'uploads', 'presentations');
    await mkdir(dir, { recursive: true });
    const filename = `${presentation.id}.pptx`;
    const filepath = join(dir, filename);

    await prs.writeFile(filepath);

    res.download(filepath, `${presentation.title}.pptx`);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Export presentation as PDF
router.post('/:id/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const { presentation } = req.body;

    if (!presentation) {
      throw new AppError('Presentation data required', 400);
    }

    const doc = new PDFDocument();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${presentation.title}.pdf"`
    );

    doc.pipe(res);

    // Add title
    doc.fontSize(24).font('Helvetica-Bold').text(presentation.title, { align: 'center' });
    doc.moveDown();

    // Add slides content
    presentation.slides.forEach((slide: any, index: number) => {
      doc.addPage();
      doc.fontSize(20).font('Helvetica-Bold').text(slide.title || `Slide ${index + 1}`);
      doc.moveDown();

      if (slide.content) {
        doc.fontSize(12).font('Helvetica').text(slide.content);
        doc.moveDown();
      }

      if (slide.bulletPoints) {
        doc.fontSize(11);
        slide.bulletPoints.forEach((point: string) => {
          doc.text(`• ${point}`);
        });
      }

      if (slide.speakerNotes) {
        doc.moveDown();
        doc.fontSize(10).font('Helvetica-Oblique').text(`Speaker Notes: ${slide.speakerNotes}`);
      }

      doc.moveDown();
    });

    doc.end();
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

function getBackgroundColor(style: string): string {
  const colors: { [key: string]: string } = {
    School: 'FFFFFF',
    Professional: 'F5F5F5',
    Minimal: 'FFFFFF',
    Creative: 'FFE5E5',
    Science: 'E5E5FF',
    Business: '003366',
    Dark: '1A1A1A',
  };
  return colors[style] || 'FFFFFF';
}

export default router;
