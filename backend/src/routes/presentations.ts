import express, { Router, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Mock database for presentations
const presentations: any[] = [];

// Generate presentation endpoint
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { topic, slideCount, style, language = 'en' } = req.body;

    if (!topic) {
      throw new AppError('Topic is required', 400);
    }

    if (!slideCount || ![5, 8, 10, 15].includes(slideCount)) {
      throw new AppError('Invalid slide count. Choose from: 5, 8, 10, 15', 400);
    }

    const validStyles = ['School', 'Professional', 'Minimal', 'Creative', 'Science', 'Business', 'Dark'];
    if (style && !validStyles.includes(style)) {
      throw new AppError(`Invalid style. Choose from: ${validStyles.join(', ')}`, 400);
    }

    // Call AI service to generate presentation
    const presentation = await generatePresentationContent(
      topic,
      slideCount,
      style || 'Professional',
      language,
      req.user?.id
    );

    presentations.push(presentation);

    res.status(201).json(presentation);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Get all presentations for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userPresentations = presentations.filter(p => p.userId === req.user?.id);
    res.json(userPresentations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single presentation
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const presentation = presentations.find(
      p => p.id === req.params.id && p.userId === req.user?.id
    );

    if (!presentation) {
      throw new AppError('Presentation not found', 404);
    }

    res.json(presentation);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Update presentation
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const index = presentations.findIndex(
      p => p.id === req.params.id && p.userId === req.user?.id
    );

    if (index === -1) {
      throw new AppError('Presentation not found', 404);
    }

    const { title, slides, metadata } = req.body;
    presentations[index] = {
      ...presentations[index],
      title: title || presentations[index].title,
      slides: slides || presentations[index].slides,
      metadata: { ...presentations[index].metadata, ...metadata },
      updatedAt: new Date(),
    };

    res.json(presentations[index]);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Delete presentation
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const index = presentations.findIndex(
      p => p.id === req.params.id && p.userId === req.user?.id
    );

    if (index === -1) {
      throw new AppError('Presentation not found', 404);
    }

    presentations.splice(index, 1);
    res.json({ message: 'Presentation deleted successfully' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Helper function to generate presentation content
async function generatePresentationContent(
  topic: string,
  slideCount: number,
  style: string,
  language: string,
  userId?: string
) {
  const id = uuidv4();
  
  // This would call the AI service in production
  // For now, returning mock data structure
  const slides = generateMockSlides(topic, slideCount);

  return {
    id,
    userId,
    title: `${topic} - Presentation`,
    topic,
    slideCount,
    style,
    language,
    slides,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      generatedBy: 'AI',
    },
  };
}

function generateMockSlides(topic: string, count: number) {
  const slides = [];
  
  // Title slide
  slides.push({
    id: uuidv4(),
    type: 'title',
    title: topic,
    subtitle: 'A presentation powered by SlideGenius AI',
    speakerNotes: `Welcome to the presentation on ${topic}. This is the title slide.`,
  });

  // Introduction slide
  slides.push({
    id: uuidv4(),
    type: 'intro',
    title: 'Introduction',
    content: `Today we'll explore the key aspects of ${topic}...`,
    speakerNotes: `Begin by introducing the topic of ${topic}. This sets the context for the presentation.`,
  });

  // Main content slides
  for (let i = 0; i < count - 3; i++) {
    slides.push({
      id: uuidv4(),
      type: 'content',
      title: `Key Point ${i + 1}`,
      content: `This is an important aspect of ${topic}...`,
      bulletPoints: [
        'Point 1',
        'Point 2',
        'Point 3',
      ],
      speakerNotes: `Discuss key point ${i + 1} in detail...`,
    });
  }

  // Conclusion slide
  slides.push({
    id: uuidv4(),
    type: 'conclusion',
    title: 'Conclusion',
    content: `In summary, ${topic} is important because...`,
    speakerNotes: 'Wrap up the presentation and thank the audience.',
  });

  // Thank you slide
  slides.push({
    id: uuidv4(),
    type: 'thank-you',
    title: 'Thank You',
    subtitle: 'Questions?',
    speakerNotes: 'Open the floor for questions and discussion.',
  });

  return slides;
}

export default router;
