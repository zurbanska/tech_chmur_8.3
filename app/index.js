const express = require('express');
const Redis = require('ioredis');
const pg = require('pg')

const app = express();
const port = 3000;

app.use(express.json());

const redisClient = new Redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });

const postgresClient = new pg.Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

// redis messages
app.post('/messages', async (req, res) => {
  try {
    const { message } = req.body;
    await redisClient.rpush('messages', message);
    console.log(`Got a new message: ${message}`)
    res.send('Success!');
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

app.get('/messages', async (req, res) => {
  try {
    const messages = await redisClient.lrange('messages', 0, -1);
    res.send(messages);
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});

// postgres users
app.post('/users', (req, res) => {
    const { username, password } = req.body;
    postgresClient.connect(function(err, client, done) {
        if(err) {
            res.status(500).send('Connection error');
        }
        client.query(`CREATE USER ${username} WITH PASSWORD '${password}'`, function(err, result) {
          done();
          if(err) {
            res.status(500).send('Internal server error');
          }
          console.log(result);
          res.send("Success!");
        });
    });

});

app.get('/users', (req,res) => {
    postgresClient.connect(function(err, client, done) {
        if(err) {
            res.status(500).send('Connection error');
        }
        client.query("SELECT * FROM pg_catalog.pg_user", function(err, result) {
          done();
          if(err) {
            res.status(500).send('Internal server error');
          }
          res.send(result.rows);
        });
    });
});


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});