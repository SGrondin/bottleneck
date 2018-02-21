local settings_key = KEYS[1]
local running_key = KEYS[2]
local executing_key = KEYS[3]

local index = ARGV[1]
local weight = tonumber(ARGV[2])
local expiration = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local running = tonumber(refresh_running(executing_key, running_key, settings_key, now))
local settings = redis.call('hmget', settings_key,
  'maxConcurrent',
  'reservoir',
  'nextRequest',
  'minTime'
)
local maxConcurrent = tonumber(settings[1])
local reservoir = tonumber(settings[2])
local nextRequest = tonumber(settings[3])
local minTime = tonumber(settings[4])

if conditions_check(weight, maxConcurrent, running, reservoir) then

  if expiration ~= nil then
    redis.call('zadd', executing_key, now + expiration, index)
  end
  redis.call('hset', running_key, index, weight)
  redis.call('hincrby', settings_key, 'running', weight)

  local wait = math.max(nextRequest - now, 0)

  if reservoir == nil then
    redis.call('hset', settings_key,
    'nextRequest', now + wait + minTime
    )
  else
    reservoir = reservoir - weight
    redis.call('hmset', settings_key,
      'reservoir', reservoir,
      'nextRequest', now + wait + minTime
    )
  end

  return {true, wait, reservoir}

else
  return {false}
end
