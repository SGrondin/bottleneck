local settings_key = KEYS[1]
local running_key = KEYS[2]
local executing_key = KEYS[3]

local weight = tonumber(ARGV[1])
local now = tonumber(ARGV[2])

local running = tonumber(refresh_running(executing_key, running_key, settings_key, now))
local settings = redis.call('hmget', settings_key,
  'maxConcurrent',
  'reservoir',
  'nextRequest'
)
local maxConcurrent = tonumber(settings[1])
local reservoir = tonumber(settings[2])
local nextRequest = tonumber(settings[3])

local conditionsCheck = conditions_check(weight, maxConcurrent, running, reservoir)

local result = conditionsCheck and nextRequest - now <= 0

return result
