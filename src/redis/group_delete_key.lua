local settings_key = KEYS[1]
local running_key = KEYS[2]
local executing_key = KEYS[3]

return redis.call('del', settings_key, running_key, executing_key)
