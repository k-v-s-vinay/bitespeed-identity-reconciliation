import { Router, Request, Response } from 'express';
import { identifyContact } from '../services/identifyService';

export const identifyRouter = Router();

identifyRouter.post('/identify', async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    // Validate: at least one must be provided
    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: 'At least one of email or phoneNumber must be provided'
      });
    }

    const result = await identifyContact(
      email || null,
      phoneNumber ? String(phoneNumber) : null
    );

    return res.status(200).json({ contact: result });
  } catch (error) {
    console.error('Error in /identify:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});