local incr = tonumber(ARGV[3])

redis.call('hincrby', settings_key, 'reservoir', incr)

local reservoir = process_tick(now, true)['reservoir']

local groupTimeout = tonumber(redis.call('hget', settings_key, 'groupTimeout'))
refresh_expiration(0, 0, groupTimeout)

return reservoir
