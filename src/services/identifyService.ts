import express, { Router, Request, Response } from 'express';
import { PrismaClient, LinkPrecedence } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bitespeed service is running' });
});

// --- Service Logic ---
export async function identifyContact(email: string | null, phoneNumber: string | null) {
  // Step 1: Find all contacts that match email OR phone
  let matchingContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  // Case 1: No matches — create a brand new primary contact
  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: { email, phoneNumber, linkPrecedence: LinkPrecedence.primary },
    });
    return buildResponse(newContact.id, [newContact]);
  }

  // Step 2: Collect all primary IDs from matches
  const primaryIds = new Set<number>();
  for (const contact of matchingContacts) {
    if (contact.linkPrecedence === 'primary') {
      primaryIds.add(contact.id);
    } else if (contact.linkedId) {
      primaryIds.add(contact.linkedId);
    }
  }

  // Step 3: Fetch all contacts under all involved primaries
  let allContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: Array.from(primaryIds) } },
        { linkedId: { in: Array.from(primaryIds) } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  // Step 4: If there are multiple primaries, merge them (older wins)
  const primaries = allContacts
    .filter(c => c.linkPrecedence === 'primary')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (primaries.length > 1) {
    const winner = primaries[0];
    const losers = primaries.slice(1);

    await prisma.contact.updateMany({
      where: { id: { in: losers.map(l => l.id) } },
      data: {
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: winner.id,
        updatedAt: new Date(),
      },
    });

    await prisma.contact.updateMany({
      where: { linkedId: { in: losers.map(l => l.id) } },
      data: { linkedId: winner.id, updatedAt: new Date() },
    });

    allContacts = await prisma.contact.findMany({
      where: { deletedAt: null, OR: [{ id: winner.id }, { linkedId: winner.id }] },
      orderBy: { createdAt: 'asc' },
    });
  }

  const primaryContact = allContacts.find(c => c.linkPrecedence === 'primary')!;

  // Step 5: Check if the incoming request has NEW information
  const emailExists = email && allContacts.some(c => c.email === email);
  const phoneExists = phoneNumber && allContacts.some(c => c.phoneNumber === phoneNumber);
  const hasNewInfo = (email && !emailExists) || (phoneNumber && !phoneExists);

  if (hasNewInfo) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: primaryContact.id,
        linkPrecedence: LinkPrecedence.secondary,
      },
    });

    allContacts = await prisma.contact.findMany({
      where: { deletedAt: null, OR: [{ id: primaryContact.id }, { linkedId: primaryContact.id }] },
      orderBy: { createdAt: 'asc' },
    });
  }

  return buildResponse(primaryContact.id, allContacts);
}

function buildResponse(primaryId: number, contacts: any[]) {
  const primary = contacts.find(c => c.id === primaryId);
  const secondaries = contacts.filter(c => c.id !== primaryId);

  const emails: string[] = [];
  if (primary?.email) emails.push(primary.email);
  for (const c of secondaries) {
    if (c.email && !emails.includes(c.email)) emails.push(c.email);
  }

  const phoneNumbers: string[] = [];
  if (primary?.phoneNumber) phoneNumbers.push(primary.phoneNumber);
  for (const c of secondaries) {
    if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) {
      phoneNumbers.push(c.phoneNumber);
    }
  }

  return {
    primaryContatctId: primaryId, // typo intentional to match spec
    emails,
    phoneNumbers,
    secondaryContactIds: secondaries.map(c => c.id),
  };
}

// --- Router ---
const identifyRouter = Router();

identifyRouter.post('/identify', async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: 'At least one of email or phoneNumber must be provided',
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

// Mount router
app.use('/', identifyRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});