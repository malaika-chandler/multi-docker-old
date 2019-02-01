const keys = require('./keys');



/**** Express App Setup ****/

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// This object will be what respondes to http requests to/from
// the React app
const app = express();

// Allows cross-origin requests between different domains used
// for the express and react apps
app.use(cors());

// This will parse incoming requests and turn them into json
app.use(bodyParser.json());



/**** Postgres Client Setup ****/

// Grab the Pool module from the pg library
const { Pool } = require('pg');
const pgClient = new Pool({
	user: keys.pgUser,
	host: keys.pgHost,
	database: keys.pgDatabase,
	password: keys.pgPassword,
	port: keys.pgPort,
});

pgClient.on('error', () => console.log('Lost PG connection'));

// Need to create a table that will store the indexes that
// have been seen
pgClient
	.query('CREATE TABLE IF NOT EXISTS values (number integer)')
	.catch(err => console.log(err)); // Catch error



/**** Redis Client Setup ****/

const redis = require('redis');
const redisClient = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 1000
});

// Duplicate clients are needed because according to redis
// documentation, a client set up for listening, publishing
// can't do other things
const redisPublisher = redisClient.duplicate();



/**** Express Route Handlers ****/

// Test route to make sure things are hooked up
app.get('/', (req, res) => {
	res.send('Hi');
});

// This route will query all the values in Postgres that
// have been submitted to the application
app.get('/values/all', async (req, res) => {
	const values = await pgClient.query('SELECT * FROM values');

	// Make sure only data sent back
	res.send(values.rows);
});

// This route grabs all values from redis client
app.get('/values/current', async (req, res) => {

	// redis doesn't have fance await syntax :(
	redisClient.hgetall('values', (err, values) => {
		res.send(values);
	});
});

// This route posts newly submitted indexes from user
app.post('/values', async (req, res) => {
	const index = req.body.index;

	// Haven't implemented an efficient version of fib()
	// so prevent hanging by capping the number
	if (parseInt(index) > 40) {
		return res.status(422).send('Index too high');
	}

	// The worker script will come replace this with the
	// calculated value
	redisClient.hset('values', index, 'Nothing yet!');

	// This is the message that tells the worker to start
	// calculating the newly inserted index fib() value
	redisPublisher.publish('insert', index);

	// Insert index into the values table in Postgres
	pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

	// Send back some arbitary response to indicate that
	// things are working
	res.send({working: true});
});

// Set the app up to listen on port 5000
app.listen(5000, err => {
	console.log('Listening');
});
