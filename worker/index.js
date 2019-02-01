// Grab redis keys from keys.js file
const keys = require('./keys.js');
const redis = require('redis');

const redisClient = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,

	// If connection to redis server is lost, try to reconnect
	// once every 1000ms
	retry_strategy: () => 1000
});

// Subscription
const sub = redisClient.duplicate();


// Definitely not an ideal solution to calculating fibonnaci
// numbers, but one that is useful for highlighting the need
// for a separate worker process and using redis
function fib(index) {
	if (index < 2) return 1;
	return fib(index - 1) + fib(index - 2);
}

// Anytime we see a new message/index in redis, call this
// callback function
sub.on('message', (channel, message) => {
	// In a hash set of values, insert the new message (index)
	// we get from redis by calculating the result of calling
	// the fib() method on the new index
	redisClient.hset('values', message, fib(parseInt(message)));
});

// Subscribe to new insert events; try to calculate new value
// of a given index if new in redis
sub.subscribe('insert');