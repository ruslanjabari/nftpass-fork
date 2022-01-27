"use strict";

require("dotenv").config();

const { REDIS_PASSWORD = "", REDIS_URL, REDIS_CA = "" } = process.env;

const redis = require("redis");

const options = {
  enable_offline_queue: true,
  no_ready_check: true,
  retry_strategy: (options) => {
    if (options.error && options.error.code === "ECONNREFUSED") {
      return new Error("The server refused the connection");
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error("Retry time exhausted");
    }
    if (options.attempt > 10) {
      return undefined;
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
  },
};

redis.debug_mode = false;

// bluebird.promisifyAll(redis.RedisClient.prototype);

const RedisClient = (() => {
  return redis.createClient(
    "redis://:p01ae314dbeaf1e9d9f38982b28e86568ceb1d18c86c6255b8757545797369588@ec2-54-159-238-171.compute-1.amazonaws.com:19670",
    options
  );
})();

module.exports = RedisClient;
