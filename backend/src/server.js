import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4000);

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smartcare',
});

const businessInfo = {
  name: 'SmartCare Supply Co.',
  welcome:
    'Hi! I can help with product questions, recommendations, and complaint follow-up.',
};

const sampleProducts = [
  {
    id: 1,
    name: 'TrailMate School Backpack',
    category: 'Backpacks',
    price: 49.99,
    description: 'Water-resistant, padded straps, and a reinforced laptop compartment.',
    features: ['durable material', 'padded straps', 'laptop sleeve', 'water-resistant'],
    availability: 'In Stock',
  },
  {
    id: 2,
    name: 'Summit Canvas Daypack',
    category: 'Backpacks',
    price: 64.5,
    description: 'A structured daypack for commuting, school, and everyday carry.',
    features: ['large main compartment', 'front organizer', 'water-resistant canvas'],
    availability: 'Low Stock',
  },
  {
    id: 3,
    name: 'UrbanFlex Travel Tote',
    category: 'Totes',
    price: 38.0,
    description: 'A travel-friendly tote designed for daily organization and light loads.',
    features: ['inside pockets', 'lightweight', 'easy-carry handles'],
    availability: 'In Stock',
  },
  {
    id: 4,
    name: 'Northline Travel Duffel',
    category: 'Luggage',
    price: 89.99,
    description: 'A roomy duffel with smooth wheels and enough space for a weekend trip.',
    features: ['wheeled base', 'dual handles', 'water-resistant shell'],
    availability: 'Out of Stock',
  },
];

function sanitizeText(value = '') {
  return String(value).trim();
}

function normalizeText(value = '') {
  return sanitizeText(value).toLowerCase();
}

function makeReferenceId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SC-${date}-${randomPart}`;
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      description TEXT NOT NULL,
      features TEXT[] NOT NULL,
      availability TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS complaints (
      id SERIAL PRIMARY KEY,
      reference_id TEXT NOT NULL UNIQUE,
      customer_name TEXT,
      customer_contact TEXT,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const existing = await pool.query('SELECT COUNT(*) AS count FROM products');
  if (Number(existing.rows[0].count) === 0) {
    for (const product of sampleProducts) {
      await pool.query(
        `INSERT INTO products (name, category, price, description, features, availability)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          product.name,
          product.category,
          product.price,
          product.description,
          product.features,
          product.availability,
        ],
      );
    }
  }
}

async function getProducts() {
  const result = await pool.query(
    'SELECT id, name, category, price, description, features, availability FROM products ORDER BY id ASC',
  );

  return result.rows.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    description: product.description,
    features: product.features,
    availability: product.availability,
  }));
}

function rankProducts(products, query) {
  const lowerQuery = normalizeText(query);
  const tokens = lowerQuery
    .split(/\s+/)
    .filter((token) => token.length > 2 && !['the', 'and', 'for', 'with', 'what', 'how', 'much', 'does', 'would', 'you', 'your', 'this', 'that', 'from', 'look'].includes(token));

  return products
    .map((product) => {
      const haystack = [
        product.name,
        product.category,
        product.description,
        ...(product.features || []),
      ]
        .join(' ')
        .toLowerCase();

      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) score += 3;
      }

      if (lowerQuery.includes('durable') && product.features.some((feature) => feature.includes('durable'))) score += 4;
      if (lowerQuery.includes('school') && product.category.toLowerCase().includes('backpack')) score += 4;
      if (lowerQuery.includes('budget') || lowerQuery.includes('price')) score += 1;

      return { ...product, score };
    })
    .filter((product) => product.score > 0)
    .sort((a, b) => b.score - a.score);
}

function buildCatalogueResponse(message, products) {
  const ranked = rankProducts(products, message);
  if (ranked.length === 0) {
    return {
      type: 'no-match',
      reply:
        'I could not find a matching product in the current catalogue. Please ask about a backpack, tote, or travel item we carry, and I can narrow it down.',
    };
  }

  const topProducts = ranked.slice(0, 3);
  const productList = topProducts
    .map(
      (product) =>
        `- ${product.name}: $${product.price.toFixed(2)} | ${product.availability} | ${product.features.join(', ')}`,
    )
    .join('\n');

  return {
    type: 'catalogue-answer',
    reply: `Based on the current catalogue, I’d suggest:\n${productList}\n\nIf you want a durable backpack within a budget, the ${topProducts[0].name} is the strongest fit because it is durable, padded, and priced at $${topProducts[0].price.toFixed(2)}.`,
    products: topProducts,
  };
}

function containsComplaintIntent(message) {
  const lower = normalizeText(message);
  const complaintKeywords = [
    'damaged',
    'broken',
    'problem',
    'issue',
    'complaint',
    'defective',
    'missing',
    'wrong item',
    'not working',
    'poor quality',
    'late',
    'refund',
  ];

  return complaintKeywords.some((keyword) => lower.includes(keyword));
}

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  res.json({ ok: true, business: businessInfo.name });
});

app.get('/api/business', async (req, res) => {
  res.json({ business: businessInfo });
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load product catalogue.' });
  }
});

app.get('/api/complaints', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, reference_id, customer_name, customer_contact, description, status, created_at, updated_at FROM complaints ORDER BY created_at DESC',
    );

    const complaints = result.rows.map((row) => ({
      id: row.id,
      referenceId: row.reference_id,
      customerName: row.customer_name,
      customerContact: row.customer_contact,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ complaints });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load complaints.' });
  }
});

app.post('/api/chat', async (req, res) => {
  const message = sanitizeText(req.body?.message || '');

  if (!message) {
    return res.status(400).json({ error: 'Please enter a question.' });
  }

  if (containsComplaintIntent(message)) {
    return res.json({
      type: 'complaint-prompt',
      reply:
        'I’m sorry to hear that. I can record this complaint for the business owner. Please provide the details in the complaint form below and I’ll save it for follow-up.',
      products: [],
    });
  }

  try {
    const products = await getProducts();
    const answer = buildCatalogueResponse(message, products);
    res.json(answer);
  } catch (error) {
    res.status(500).json({ error: 'Unable to answer the question right now.' });
  }
});

app.post('/api/complaints', async (req, res) => {
  const description = sanitizeText(req.body?.description || '');
  const customerName = sanitizeText(req.body?.customerName || '');
  const customerContact = sanitizeText(req.body?.customerContact || '');

  if (!description) {
    return res.status(400).json({ error: 'Complaint description is required.' });
  }

  try {
    const referenceId = makeReferenceId();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO complaints (reference_id, customer_name, customer_contact, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'Open', $5, $5)
       RETURNING id, reference_id, customer_name, customer_contact, description, status, created_at, updated_at`,
      [referenceId, customerName || 'Anonymous', customerContact || null, description, now],
    );

    const complaint = result.rows[0];

    res.status(201).json({
      id: complaint.id,
      referenceId: complaint.reference_id,
      customerName: complaint.customer_name,
      customerContact: complaint.customer_contact,
      description: complaint.description,
      status: complaint.status,
      createdAt: complaint.created_at,
      updatedAt: complaint.updated_at,
      message: 'Your complaint has been recorded and is now visible in the business dashboard.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to save the complaint.' });
  }
});

app.patch('/api/complaints/:id', async (req, res) => {
  const complaintId = Number(req.params.id);
  const nextStatus = sanitizeText(req.body?.status || '');

  if (!Number.isInteger(complaintId) || !nextStatus) {
    return res.status(400).json({ error: 'A valid complaint ID and status are required.' });
  }

  const validStatuses = ['Open', 'In Progress', 'Resolved'];
  if (!validStatuses.includes(nextStatus)) {
    return res.status(400).json({ error: 'Status must be Open, In Progress, or Resolved.' });
  }

  try {
    const result = await pool.query(
      `UPDATE complaints
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, reference_id, customer_name, customer_contact, description, status, created_at, updated_at`,
      [nextStatus, complaintId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    res.json({ complaint: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update the complaint status.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(port, () => {
      console.log(`SmartCare backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start SmartCare backend.', error);
    process.exit(1);
  }
}

startServer();
