local queued = tonumber(ARGV[3])

redis.call('zadd', client_running_key, 0, client)
redis.call('hset', client_num_queued_key, client, queued)
redis.call('zadd', client_last_registered_key, 0, client)

return {}
