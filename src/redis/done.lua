local settings_key = KEYS[1]
local running_key = KEYS[2]
local executing_key = KEYS[3]
local now = ARGV[1]

local running = refresh_running(executing_key, running_key, settings_key, now)

-- [LEGACY] hincrby instead of hget because "done" doesn't exist <= 2.9.0
return tonumber(redis.call('hincrby', settings_key, 'done', 0))
