require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// instance
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
);

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  // console.log('verify token', token);

  // no token
  if (!token) {
    return res.status(401).send({
      message: 'Unauthorized access',
    });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    // invalid token
    if (error) {
      return res.status(401).send({
        message: 'Unauthorized Access',
      });
    }
    // save decoded user info
    req.decoded = decoded;
    next();
  });
};

// database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.89rnkti.mongodb.net/?appName=Cluster0`;
// console.log(uri);

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log('Connected your db');
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment');
    // =================   DATABASE =======================
    const database = client.db('jobsDB2');
    const jobsCollection = database.collection('jobsColl2');
    const applicationsCollection = database.collection('appsColl2');

    // =================   JSON WEB TOKEN  =======================
    app.post('/jwt/login', (req, res) => {
      const userPayload = req.body;
      const tokenValue = jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });

      res
        .cookie('token', tokenValue, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.post('/jwt/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // =================   JOBS  =======================
    app.get('/jobs', async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/jobs/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.post('/jobs/add', async (req, res) => {
      console.log(req.body);
      const doc = req.body;
      const result = await jobsCollection.insertOne(doc);
      res.send(result);
    });

    app.delete('/jobs/delete/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    // =================   APPLICATIONS  =======================

    app.get('/applications/admin/view/:jobId', async (req, res) => {
      const query = { job_id: req.params.jobId };
      const result = await applicationsCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/applications/me', verifyToken, async (req, res) => {
      const query = { applicant_email: req.query.email };
      const cursor = applicationsCollection.find(query);
      const result = await cursor.toArray();

      // === aggregate data ===
      for (const item of result) {
        // console.log(item.job_id);
        const querySecond = { _id: new ObjectId(item.job_id) };
        const resultSecond = await jobsCollection.findOne(querySecond);

        if (resultSecond) {
          item.title = resultSecond.title;
          item.company = resultSecond.company;
          item.company_logo = resultSecond.company_logo;
          item.location = resultSecond.location;
          item.jobType = resultSecond.jobType;
        }
      }

      res.send(result);
    });

    app.patch('/applications/admin/status/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const updateDoc = {
        $set: {
          status: req.body.status,
        },
      };
      const result = await applicationsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.post('/applications/me/apply', async (req, res) => {
      const doc = req.body;
      const result = await applicationsCollection.insertOne(doc);
      // console.log(result);

      // === agreegate data ===
      const querySecond = { _id: new ObjectId(doc.job_id) };
      const resultSecond = await jobsCollection.findOne(querySecond);
      // console.log(resultSecond);

      let count = 0;
      if (resultSecond?.applicationCount) {
        count = resultSecond.applicationCount + 1;
      } else {
        count = 1;
      }

      const queryThird = { _id: new ObjectId(doc.job_id) };
      const updateDocThird = {
        $set: {
          applicationCount: count,
        },
      };
      const resultThird = await jobsCollection.updateOne(queryThird, updateDocThird);
      console.log(resultThird);

      res.send(result);
    });

    app.delete('/applications/me/delete/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await applicationsCollection.deleteOne(query);
      res.send(result);
    });
  } catch (error) {
    console.log(error);
  }
}
run();

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
