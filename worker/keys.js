// Save redis host/port data as environment variables
// and export to index.js
module.exports = {
	redisHost: process.env.REDIS_HOST,
	redisPort: process.env.REDIS_PORT
}