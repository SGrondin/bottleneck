redis.call('zadd', client_running_key, 0, client)

return {}
