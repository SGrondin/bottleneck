if not (redis.call('exists', settings_key) == 1) then
  return redis.error_reply('SETTINGS_KEY_NOT_FOUND')
end

if not redis.call('zscore', client_running_key, client) then
  -- Register new client
  redis.call('zadd', client_running_key, 0, client)
  redis.call('hset', client_num_queued_key, client, queued)
  redis.call('zadd', client_last_registered_key, 0, client)
end

redis.call('zadd', client_last_seen_key, now, client)
