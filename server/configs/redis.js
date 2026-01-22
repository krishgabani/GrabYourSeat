import Redis from "ioredis";

let redis;

// Prevent creating multiple Redis connections in Vercel
if (!global.redis) {
    global.redis = new Redis(process.env.REDIS_URL);

    global.redis.on("connect", () => {
        console.log("Redis connected");
    });

    global.redis.on("error", (err) => {
        console.error("Redis connection error:", err);
    });
}

redis = global.redis;

export default redis;
