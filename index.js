// ======================================================
// PACKAGES
// ======================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// ======================================================
// EXPRESS APP
// ======================================================
const app = express();
const port = process.env.PORT || 5000;

// ======================================================
// MIDDLEWARES
// ======================================================

// parse json body
app.use(express.json());

// parse cookies
app.use(cookieParser());

// cors setup
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://tech-job-portal-2.web.app',
      'https://tech-job-portal-2.firebaseapp.com',
    ],

    credentials: true,
  })
);

// verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({
      message: 'No token..Unauthorized access',
    });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({
        message: 'Invalid token',
      });
    }

    req.decoded = decoded;
    next();
  });
};

// ======================================================
// MONGODB URI
// ======================================================

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.89rnkti.mongodb.net/?appName=Cluster0`;

// ======================================================
// MONGODB CLIENT
// ======================================================

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ======================================================
// DATABASE FUNCTION
// ======================================================

async function run() {
  try {
    // connect mongodb
    await client.connect();

    console.log('Connected your db');

    // ping mongodb
    await client.db('admin').command({ ping: 1 });

    console.log('Pinged your deployment');

    // ======================================================
    // DATABASE COLLECTIONS
    // ======================================================

    const database = client.db('jobsDB2');

    const jobsCollection = database.collection('jobsColl2');

    const applicationsCollection = database.collection('appsColl2');

    // ======================================================
    // JWT LOGIN
    // ======================================================

    app.post('/jwt/login', (req, res) => {
      // console.log(process.env.ACCESS_TOKEN_SECRET);

      // get user payload
      const userPayload = req.body;

      // create jwt token
      const tokenValue = jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '7d',
      });

      // production check
      const isProduction = process.env.NODE_ENV === 'production';

      // send cookie
      res
        .cookie('token', tokenValue, {
          httpOnly: true,
          secure: isProduction ? true : false,
          sameSite: isProduction ? 'none' : 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .send({
          success: true,
        });
    });

    // ======================================================
    // JWT LOGOUT
    // ======================================================

    app.post('/jwt/logout', (req, res) => {
      // production check
      const isProduction = process.env.NODE_ENV === 'production';

      // clear cookie
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: isProduction ? true : false,
          sameSite: isProduction ? 'none' : 'lax',
        })
        .send({
          success: true,
        });
    });

    // ======================================================
    // JOB ROUTES
    // ======================================================

    // get all jobs
    app.get('/jobs', async (req, res) => {
      const email = req.query.email;

      let query = {};

      // filter by hr email
      if (email) {
        query = {
          hr_email: email,
        };
      }

      const result = await jobsCollection.find(query).toArray();

      res.send(result);
    });

    // get single job
    app.get('/jobs/:id', async (req, res) => {
      const query = {
        _id: new ObjectId(req.params.id),
      };

      const result = await jobsCollection.findOne(query);

      res.send(result);
    });

    // add new job
    app.post('/jobs/add', verifyToken, async (req, res) => {
      const doc = req.body;

      const result = await jobsCollection.insertOne(doc);

      res.send(result);
    });

    // delete job
    app.delete('/jobs/delete/:id', verifyToken, async (req, res) => {
      const query = {
        _id: new ObjectId(req.params.id),
      };

      const result = await jobsCollection.deleteOne(query);

      res.send(result);
    });

    // ======================================================
    // APPLICATION ROUTES
    // ======================================================

    // admin view applications
    app.get('/applications/admin/view/:jobId', verifyToken, async (req, res) => {
      const query = {
        job_id: req.params.jobId,
      };

      const result = await applicationsCollection.find(query).toArray();

      res.send(result);
    });

    // my applications
    app.get('/applications/me', verifyToken, async (req, res) => {
      // token email must match query email
      if (req.decoded?.email !== req.query?.email) {
        return res.status(403).send({
          message: 'Forbidden access',
        });
      }

      // find applications
      const query = {
        applicant_email: req.query.email,
      };

      const result = await applicationsCollection.find(query).toArray();

      // aggregate related job info
      for (const item of result) {
        const querySecond = {
          _id: new ObjectId(item.job_id),
        };

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

    // admin update application status
    app.patch('/applications/admin/status/:id', verifyToken, async (req, res) => {
      const query = {
        _id: new ObjectId(req.params.id),
      };

      const updateDoc = {
        $set: {
          status: req.body.status,
        },
      };

      const result = await applicationsCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    // my apply for job
    app.post('/applications/me/apply', verifyToken, async (req, res) => {
      const doc = req.body;

      const result = await applicationsCollection.insertOne(doc);

      const querySecond = {
        _id: new ObjectId(doc.job_id),
      };

      const resultSecond = await jobsCollection.findOne(querySecond);

      let count = 0;

      if (resultSecond?.applicationCount) {
        count = resultSecond.applicationCount + 1;
      } else {
        count = 1;
      }

      const queryThird = {
        _id: new ObjectId(doc.job_id),
      };

      const updateDocThird = {
        $set: {
          applicationCount: count,
        },
      };

      await jobsCollection.updateOne(queryThird, updateDocThird);

      res.send(result);
    });

    // delete application
    app.delete('/applications/me/delete/:id', verifyToken, async (req, res) => {
      const query = {
        _id: new ObjectId(req.params.id),
      };

      const result = await applicationsCollection.deleteOne(query);

      res.send(result);
    });
  } catch (error) {
    console.log(error);
  }
}

// run database function
run();

// ======================================================
// ROOT ROUTE
// ======================================================

app.get('/', (req, res) => {
  res.send('Server is running');
});

// ======================================================
// SERVER LISTEN
// ======================================================

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
