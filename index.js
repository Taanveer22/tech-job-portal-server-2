require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// instance
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

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

    app.get('/applications/me', async (req, res) => {
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
