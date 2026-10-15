
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
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/smartcare_ai',
});
pool.on('error', (error) => {
  console.error('SmartCare AI database error:', error);
});

const businessInfo = {
  name: 'SmartCare AI',
  welcome:
    'Welcome to SmartCare AI — your intelligent business partner for discovering quality products, making informed purchasing decisions, and accessing reliable business assistance.',
};

const sampleProducts = [
  {
    name: 'TrailMate School Backpack',
    category: 'Backpacks',
    price: 49.99,
    description:
      'Water-resistant backpack with padded straps and a reinforced laptop compartment.',
    features: [
      'durable material',
      'padded straps',
      'laptop sleeve',
      'water-resistant',
    ],
    availability: 'In Stock',
  },
  {
    name: 'Summit Canvas Daypack',
    category: 'Backpacks',
    price: 64.5,
    description:
      'A structured daypack for commuting, school, and everyday use.',
    features: [
      'large main compartment',
      'front organizer',
      'water-resistant canvas',
    ],
    availability: 'Low Stock',
  },
  {
    name: 'UrbanFlex Travel Tote',
    category: 'Totes',
    price: 38,
    description:
      'A lightweight tote designed for daily organization and travel.',
    features: [
      'inside pockets',
      'lightweight',
      'easy-carry handles',
    ],
    availability: 'In Stock',
  },
  {
    name: 'Northline Travel Duffel',
    category: 'Luggage',
    price: 89.99,
    description:
      'A roomy duffel with smooth wheels for weekend trips.',
    features: [
      'wheeled base',
      'dual handles',
      'water-resistant shell',
    ],
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
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `SC-${date}-${randomPart}`;
}

// Create database tables and seed products only when necessary.
async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_ratings (
      id SERIAL PRIMARY KEY,
      rating INTEGER NOT NULL
        CHECK (rating BETWEEN 1 AND 5),
      feedback TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const existing = await pool.query(
    'SELECT COUNT(*) AS count FROM products'
  );

  if (Number(existing.rows[0].count) === 0) {
    for (const product of sampleProducts) {
      await pool.query(
        `INSERT INTO products
          (name, category, price, description, features, availability)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          product.name,
          product.category,
          product.price,
          product.description,
          product.features,
          product.availability,
        ]
      );
    }

    console.log('SmartCare product catalogue initialized.');
  }

  console.log('SmartCare AI database initialized.');
}

async function getProducts() {
  const result = await pool.query(
    `SELECT id, name, category, price, description,
            features, availability
     FROM products
     ORDER BY id ASC`
  );

  return result.rows.map((product) => ({
    ...product,
    price: Number(product.price),
  }));
}

function rankProducts(products, query) {
  const lowerQuery = normalizeText(query);

  const ignoredWords = [
    'the', 'and', 'for', 'with', 'what', 'how',
    'much', 'does', 'would', 'you', 'your',
    'this', 'that', 'from', 'look', 'need',
    'want', 'recommend', 'recommendation',
    'someone', 'under', 'cost', 'price',
  ];

  const tokens = lowerQuery
    .split(/\s+/)
    .filter(
      (token) => token.length > 2 && !ignoredWords.includes(token)
    );

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
        if (haystack.includes(token)) {
          score += 3;
        }
      }

      if (
        lowerQuery.includes('durable') &&
        haystack.includes('durable')
      ) {
        score += 4;
      }

      if (
        lowerQuery.includes('school') &&
        product.category.toLowerCase().includes('backpack')
      ) {
        score += 4;
      }

      if (
        lowerQuery.includes('under $60') ||
        lowerQuery.includes('below $60')
      ) {
        if (product.price < 60) score += 8;
        else score -= 5;
      }

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
        'I could not find a matching item in our current catalogue. Please ask about backpacks, totes, or travel products.',
      products: [],
    };
  }

  const topProducts = ranked.slice(0, 3);

  const productList = topProducts
    .map(
      (product) =>
        `- ${product.name}: $${product.price.toFixed(2)} | ` +
        `${product.availability} | ${product.features.join(', ')}`
    )
    .join('\n');

  return {
    type: 'catalogue-answer',
    reply:
      `Here are products that may suit your needs:\n${productList}\n\n` +
      'Would you like more details about any of these products?',
    products: topProducts,
  };
}

function containsComplaintIntent(message) {
  const lower = normalizeText(message);

  const keywords = [
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

  return keywords.some((keyword) => lower.includes(keyword));
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    platform: 'SmartCare AI',
  });
});


// Business information
app.get('/api/business', (req, res) => {
  res.json({ business: businessInfo });
});

// Product catalogue
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json({ products });
  } catch (error) {
    console.error('Unable to load products:', error);
    res.status(500).json({
      error: 'Unable to load the product catalogue.',
    });
  }
});

// Retrieve saved customer complaints.
app.get('/api/complaints', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, reference_id, customer_name,
              customer_contact, description, status,
              created_at, updated_at
       FROM complaints
       ORDER BY created_at DESC`
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

    res.set('Cache-Control', 'no-store');
    res.json({ complaints });
  } catch (error) {
    console.error('Unable to load complaints:', error);
    res.status(500).json({
      error: 'Unable to load complaints.',
    });
  }
});

// Submit a customer rating and optional feedback.
app.post('/api/ratings', async (req, res) => {
  const rating = Number(req.body?.rating);
  const feedback = sanitizeText(req.body?.feedback || '');

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      error: 'Please select a rating between 1 and 5 stars.',
    });
  }

  if (feedback.length > 1000) {
    return res.status(400).json({
      error: 'Feedback must not exceed 1000 characters.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO service_ratings (rating, feedback)
       VALUES ($1, $2)
       RETURNING id, rating, feedback, created_at`,
      [rating, feedback || null]
    );

    return res.status(201).json({
      message: 'Thank you for rating SmartCare AI!',
      rating: result.rows[0],
    });
  } catch (error) {
    console.error('Unable to save customer rating:', error);
    return res.status(500).json({
      error: 'Unable to save your rating right now.',
    });
  }
});

// Retrieve customer ratings and the average rating.
app.get('/api/ratings', async (req, res) => {
  try {
    const [ratingsResult, summaryResult] = await Promise.all([
      pool.query(
        `SELECT id, rating, feedback, created_at
         FROM service_ratings
         ORDER BY created_at DESC
         LIMIT 100`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COALESCE(
                  ROUND(AVG(rating)::numeric, 1), 0
                ) AS average
         FROM service_ratings`
      ),
    ]);

    const summary = {
      total: Number(summaryResult.rows[0].total),
      average: Number(summaryResult.rows[0].average),
    };

    res.set('Cache-Control', 'no-store');
    return res.json({
      ratings: ratingsResult.rows,
      summary,
    });
  } catch (error) {
    console.error('Unable to load customer ratings:', error);
    return res.status(500).json({
      error: 'Unable to load customer ratings.',
    });
  }
});

// Customer chat and product recommendations.
app.post('/api/chat', async (req, res) => {
  const message = sanitizeText(req.body?.message || '');

  if (!message) {
    return res.status(400).json({
      error: 'Please enter a question.',
    });
  }

  if (containsComplaintIntent(message)) {
    return res.json({
      type: 'complaint-prompt',
      reply:
        'I am sorry you experienced this problem. Please complete the complaint form below so SmartCare AI can record it for follow-up.',
      products: [],
    });
  }

  try {
    const products = await getProducts();
    const answer = buildCatalogueResponse(message, products);
    res.json(answer);
  } catch (error) {
    console.error('Customer chat failed:', error);
    res.status(500).json({
      error: 'Unable to answer your question right now.',
    });
  }
});

// Save a new customer complaint.
app.post('/api/complaints', async (req, res) => {
  const description = sanitizeText(req.body?.description || '');
  const customerName = sanitizeText(req.body?.customerName || '');
  const customerContact = sanitizeText(
    req.body?.customerContact || ''
  );

  if (!description) {
    return res.status(400).json({
      error: 'Complaint description is required.',
    });
  }

  if (
    description.length > 5000 ||
    customerName.length > 150 ||
    customerContact.length > 250
  ) {
    return res.status(400).json({
      error: 'One or more complaint fields are too long.',
    });
  }

  try {
    const referenceId = makeReferenceId();

    const result = await pool.query(
      `INSERT INTO complaints
        (reference_id, customer_name, customer_contact, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, reference_id, customer_name,
                 customer_contact, description, status,
                 created_at, updated_at`,
      [
        referenceId,
        customerName || 'Anonymous',
        customerContact || null,
        description,
      ]
    );

    const row = result.rows[0];

    return res.status(201).json({
      id: row.id,
      referenceId: row.reference_id,
      customerName: row.customer_name,
      customerContact: row.customer_contact,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      message:
        'Your complaint has been recorded successfully.',
    });
  } catch (error) {
    console.error('Unable to save complaint:', error);
    return res.status(500).json({
      error: 'Unable to save the complaint.',
    });
  }
});

// Update complaint status from the business dashboard.
app.patch('/api/complaints/:id', async (req, res) => {
  const complaintId = Number(req.params.id);
  const nextStatus = sanitizeText(req.body?.status || '');

  if (!Number.isInteger(complaintId) || complaintId < 1) {
    return res.status(400).json({
      error: 'A valid complaint ID is required.',
    });
  }

  const validStatuses = ['Open', 'In Progress', 'Resolved'];

  if (!validStatuses.includes(nextStatus)) {
    return res.status(400).json({
      error: 'Status must be Open, In Progress, or Resolved.',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE complaints
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, reference_id, customer_name,
                 customer_contact, description, status,
                 created_at, updated_at`,
      [nextStatus, complaintId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Complaint not found.',
      });
    }

    const row = result.rows[0];

    return res.json({
      complaint: {
        id: row.id,
        referenceId: row.reference_id,
        customerName: row.customer_name,
        customerContact: row.customer_contact,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('Unable to update complaint:', error);
    return res.status(500).json({
      error: 'Unable to update the complaint status.',
    });
  }
});

// Unknown routes.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Start only after the database has initialized successfully.
async function startServer() {
  try {
    await initDatabase();

    const server = app.listen(port, () => {
      console.log(
        `SmartCare AI backend running on port ${port}`
      );
      console.log('Business: SmartCare AI.');
    });

    server.on('error', (error) => {
      console.error('SmartCare AI server error:', error);
    });
  } catch (error) {
    console.error(
      'Failed to start SmartCare AI backend:',
      error
    );
    process.exit(1);
  }
}

startServer();
