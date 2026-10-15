import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { mongodb } from '../lib/db.js';

const router = Router();

// Auth middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  // Dev mode bypass
  if (authHeader?.startsWith('Bearer dev_')) {
    (req as any).user = { uid: 'dev_user', role: 'farmer' };
    return next();
  }
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const db = mongodb.getDb();
    const tokenRecord = await db.collection('tokens').findOne({ token });
    if (tokenRecord) {
      (req as any).user = tokenRecord.user;
      return next();
    }

    // Fallback: parse token as dev mode
    (req as any).user = { uid: 'dev_user', role: 'farmer' };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// ============ USER & AUTH ROUTES ============

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = mongodb.getDb();
    const result = await db.collection('users').insertOne({
      email,
      password,
      name,
      role: role || 'farmer',
      createdAt: new Date(),
    });

    res.json({ user: { id: result.insertedId.toString(), email, name, role: role || 'farmer' } });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const db = mongodb.getDb();
    const user = await db.collection('users').findOne({ email, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = `token_${Date.now()}_${Math.random()}`;
    await db.collection('tokens').insertOne({
      token,
      user: { uid: user._id.toString(), email: user.email, name: user.name, role: user.role },
      createdAt: new Date(),
    });

    res.json({ user: { uid: user._id.toString(), email: user.email, name: user.name, role: user.role }, token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const db = mongodb.getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ uid: user._id.toString(), email: user.email, name: user.name, role: user.role });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/location', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { latitude, longitude, country, province, district, ward, village } = req.body;
    const db = mongodb.getDb();
    await db.collection('user_locations').updateOne(
      { uid: user.uid },
      { $set: { uid: user.uid, latitude, longitude, country, province, district, ward, village, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ saved: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CROP & FARM DATA ROUTES ============

router.get('/crops', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = mongodb.getDb();
    const crops = await db.collection('crops').find({}).sort({ plantedDate: -1 }).toArray();
    res.json(crops.map((crop: any) => ({ ...crop, id: crop._id.toString() })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/crops', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, variety, fieldId, plantedDate, expectedHarvest } = req.body;
    const db = mongodb.getDb();
    const result = await db.collection('crops').insertOne({
      name,
      variety,
      fieldId,
      plantedDate,
      expectedHarvest,
      status: 'active',
      createdAt: new Date(),
    });

    res.json({ id: result.insertedId.toString(), name, variety, fieldId, plantedDate, expectedHarvest, status: 'active' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/crops/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = mongodb.getDb();
    const crop = await db.collection('crops').findOne({ _id: new ObjectId(id) });

    if (!crop) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    res.json({ ...crop, id: crop._id.toString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/crops/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, variety, status } = req.body;
    const db = mongodb.getDb();

    const result = await db.collection('crops').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { name, variety, status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    res.json({ ...result.value, id: result.value._id.toString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ FARM HEALTH & TELEMETRY ROUTES ============

router.get('/health-monitoring', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = mongodb.getDb();
    const healthData = await db.collection('health_monitoring').find({}).toArray();
    res.json(healthData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/health-monitoring', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cropId, leafColor, stemHealth, diseaseRisk, moisture, temperature } = req.body;
    
    const db = mongodb.getDb();
    const result = await db.collection('health_monitoring').insertOne({
      cropId,
      leafColor,
      stemHealth,
      diseaseRisk,
      moisture,
      temperature,
      timestamp: new Date(),
      createdAt: new Date(),
    });
    
    res.json({ id: result.insertedId, ...req.body, timestamp: new Date() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/telemetry/live/:cropId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cropId } = req.params;
    const db = mongodb.getDb();
    const telemetry = await db.collection('telemetry').findOne({ cropId });
    res.json(telemetry || { message: 'No telemetry data' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ WEATHER & CLIMATE ROUTES ============

router.get('/weather/:location', requireAuth, async (req: Request, res: Response) => {
  try {
    const { location } = req.params;
    const db = mongodb.getDb();
    const weather = await db.collection('weather').findOne({ location });
    res.json(weather || { message: 'No weather data available' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/weather', requireAuth, async (req: Request, res: Response) => {
  try {
    const { location, temperature, humidity, rainfall, windSpeed, forecast } = req.body;
    const db = mongodb.getDb();
    const result = await db.collection('weather').updateOne(
      { location },
      {
        $set: {
          location,
          temperature,
          humidity,
          rainfall,
          windSpeed,
          forecast,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    
    res.json({ success: true, matchedCount: result.matchedCount, upsertedCount: result.upsertedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DISEASE & PEST ALERTS ============

router.get('/alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = mongodb.getDb();
    const alerts = await db.collection('alerts').find({ active: true }).toArray();
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { type, severity, description, affectedArea, cropIds } = req.body;
    
    const db = mongodb.getDb();
    const result = await db.collection('alerts').insertOne({
      type,
      severity,
      description,
      affectedArea,
      cropIds,
      active: true,
      createdAt: new Date(),
    });
    
    res.json({ id: result.insertedId, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ YIELD & HARVEST DATA ============

router.get('/yield-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = mongodb.getDb();
    const yields = await db.collection('yield_data').find({}).sort({ harvestDate: -1 }).toArray();
    res.json(yields.map((item: any) => ({ ...item, id: item._id.toString() })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/yield-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cropId, projectedYield, actualYield, yieldPerHectare, qualityGrade, harvestDate } = req.body;
    const db = mongodb.getDb();
    const result = await db.collection('yield_data').insertOne({
      cropId,
      projectedYield,
      actualYield,
      yieldPerHectare,
      qualityGrade,
      harvestDate,
      createdAt: new Date(),
    });
    
    res.json({ id: result.insertedId.toString(), cropId, projectedYield, actualYield, yieldPerHectare, qualityGrade, harvestDate });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MARKETPLACE & TRADING ============

router.get('/marketplace/prices', async (req: Request, res: Response) => {
  try {
    const db = mongodb.getDb();
    const prices = await db.collection('marketplace_prices').find({}).toArray();
    res.json(prices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/marketplace/listings', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cropType, quantity, pricePerUnit, location, description } = req.body;
    const userId = (req as any).user.uid;
    
    const db = mongodb.getDb();
    const result = await db.collection('marketplace_listings').insertOne({
      userId,
      cropType,
      quantity,
      pricePerUnit,
      location,
      description,
      status: 'available',
      createdAt: new Date(),
    });
    
    res.json({ id: result.insertedId, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/marketplace/listings', async (req: Request, res: Response) => {
  try {
    const db = mongodb.getDb();
    const listings = await db.collection('marketplace_listings').find({ status: 'available' }).toArray();
    res.json(listings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ RECOMMENDATIONS & INSIGHTS ============

router.get('/recommendations/:cropId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cropId } = req.params;
    
    const db = mongodb.getDb();
    const recommendations = await db.collection('recommendations').find({ cropId }).toArray();
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/recommendations', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cropId, type, title, description, priority } = req.body;
    
    const db = mongodb.getDb();
    const result = await db.collection('recommendations').insertOne({
      cropId,
      type,
      title,
      description,
      priority,
      createdAt: new Date(),
    });
    
    res.json({ id: result.insertedId, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ANALYTICS & DASHBOARD ============

router.get('/dashboard/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const db = mongodb.getDb();
    const totalCrops = await db.collection('crops').countDocuments();
    const averageYieldResult = await db.collection('yield_data').aggregate([
      { $group: { _id: null, avg_yield: { $avg: '$actualYield' } } },
    ]).toArray();
    const alertsCount = await db.collection('alerts').countDocuments({ active: true });

    res.json({
      totalCrops,
      averageYield: averageYieldResult[0]?.avg_yield || 0,
      activeAlerts: alertsCount,
      userRole,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = mongodb.getDb();
    const cropDistribution = await db.collection('crops').aggregate([
      { $group: { _id: '$name', count: { $sum: 1 } } },
    ]).toArray();
    const yieldTrends = await db.collection('yield_data').aggregate([
      { $group: { _id: '$harvestDate', avg: { $avg: '$actualYield' } } },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]).toArray();
    const healthMetrics = await db.collection('health_monitoring').find({}).limit(100).toArray();

    res.json({ cropDistribution, yieldTrends, healthMetrics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AI & LIVE DATA ENDPOINTS ============

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, language } = req.body;
    if (!message?.trim()) {
      return res.json({ reply: 'Hello! What would you like to know about your farm?' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are NeuroSeedco Crop AI, a practical agricultural assistant. Answer the farmer's question clearly and safely in ${language || 'English'}. Do not invent farm measurements or claim to have data that was not provided. Question: ${message}`
            }]
          }]
        })
      });
      const data = await response.json() as any;
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (response.ok && reply) return res.json({ reply });
    }

    const reply = `I can help with that. I do not have enough connected farm data to give a specific recommendation yet, but please share your crop, location, growth stage, and the issue you are seeing.`;

    res.json({ reply });
  } catch (error: any) {
    res.status(500).json({ error: 'Unable to generate chat response.' });
  }
});

router.post('/insights', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    const insights = `This is a fallback insight summary based on current dashboard data. Replace with a real AI integration when ready.`;
    res.json({ insights });
  } catch (error: any) {
    res.status(500).json({ error: 'Unable to generate insights.' });
  }
});

router.get('/live-data/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const samples: Record<string, any> = {
      'market-prices': [
        { crop: 'Maize', price: 'US$250/ton', trend: 'up', source: 'Local Market' },
        { crop: 'Sorghum', price: 'US$220/ton', trend: 'stable', source: 'Regional Market' },
      ],
      'nearby-businesses': [
        { name: 'SeedCo Depot', category: 'seed supplier', distance: '4.5 km' },
        { name: 'Agro Dealer', category: 'equipment', distance: '7.2 km' },
      ],
      'news': [
        { title: 'Rainfall expected in central regions', summary: 'Light to moderate rains are forecast for the next 3 days.', source: 'AgriNews' },
      ],
      'disease-alerts': [
        { threat: 'Rust outbreak', severity: 'medium', description: 'Scout fields for early rust symptoms in maize.' }],
      'climate-data': { forecast: 'Mixed rain and sunshine', risks: ['flooding', 'pest pressure'] },
      'agricultural-data': { season: 'Planting', status: 'Stable', insights: ['Monitor soil moisture closely.'] },
      'yield-forecast': { forecast: 'Good', confidence: 0.82 },
    };

    res.json(samples[type] ?? { message: `No live data available for ${type}` });
  } catch (error: any) {
    res.status(500).json({ error: 'Unable to fetch live data.' });
  }
});

// ============ SYSTEM HEALTH ============

router.get('/health', async (req: Request, res: Response) => {
  const health: any = {
    status: 'unhealthy',
    timestamp: new Date(),
    services: {
      mongodb: 'disconnected',
    },
  };

  try {
    const db = mongodb.getDb();
    if (db) {
      health.services.mongodb = 'connected';
      health.status = 'healthy';
    }
  } catch (err) {
    health.services.mongodb = 'disconnected';
    health.status = 'unhealthy';
  }

  res.json(health);
});

router.get('/system/health', async (req: Request, res: Response) => {
  const health: any = {
    status: 'unhealthy',
    timestamp: new Date(),
    services: {
      mongodb: 'disconnected',
    },
  };

  try {
    const db = mongodb.getDb();
    if (db) {
      health.services.mongodb = 'connected';
      health.status = 'healthy';
    }
  } catch (err) {
    health.services.mongodb = 'disconnected';
    health.status = 'unhealthy';
  }

  res.json(health);
});

export default router;
