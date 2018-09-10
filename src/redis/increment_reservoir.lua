local settings_key = KEYS[1]
local running_key = KEYS[2]
local executing_key = KEYS[3]

local incr = tonumber(ARGV[1])

local settings = redis.call('hmget', settings_key, 'id', 'groupTimeout')
local id = settings[1]
local groupTimeout = tonumber(settings[2])

redis.call('hincrby', settings_key, 'reservoir', incr)
redis.call('publish', 'b_'..id, 'freed:')

refresh_expiration(executing_key, running_key, settings_key, 0, 0, groupTimeout)

return {}
