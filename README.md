# Bitespeed Identity Reconciliation

## Live Endpoint
**POST** `https://YOUR-APP.onrender.com/identify`

## What It Does
Identifies and links customer contacts across multiple purchases using email and phone number matching.

## Tech Stack
- Node.js + TypeScript  
- Express.js  
- PostgreSQL + Prisma ORM  
- Deployed on Render.com  

## API Usage

### Request
http
POST /identify
Content-Type: application/json

{
  "email": "lorraine@hillvalley.edu",
  "phoneNumber": "123456"
}
### Response
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
### Local Setup
git clone https://github.com/YOUR-USERNAME/bitespeed-identity-reconciliation.git
cd bitespeed-identity-reconciliation
npm install

# Add .env with DATABASE_URL
npx prisma migrate dev
npm run dev
## Project structure
bitespeed-identity-reconciliation/
├── prisma/
│   └── schema.prisma          # Prisma schema defining Contact model & enums
├── src/
│   ├── index.ts               # Entry point (Express server setup)
│   ├── routes/
│   │   └── identify.ts        # Router handling /identify endpoint
│   └── services/
│       └── identifyService.ts # Business logic for identity reconciliation
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript compiler configuration
└── README.md                  # Project documentation
