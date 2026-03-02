import express from 'express';
import { identifyRouter } from './routes/identify';

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Health check endpoint (bonus points!)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bitespeed service is running' });
});

// Main route
app.use('/', identifyRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});