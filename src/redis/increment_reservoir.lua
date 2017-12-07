local settings_key = KEYS[1]
local incr = ARGV[1]

return redis.call('hincrby', settings_key, 'reservoir', incr)
