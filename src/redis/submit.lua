local settings_key = KEYS[1]
local running_key = KEYS[2]
local executing_key = KEYS[3]

local now = tonumber(ARGV[1])
local queueLength = tonumber(ARGV[2])
local weight = tonumber(ARGV[3])

local capacity = refresh_capacity(executing_key, running_key, settings_key, now, false)[1]

local settings = redis.call('hmget', settings_key,
  'maxConcurrent',
  'highWater',
  'nextRequest',
  'strategy',
  'unblockTime',
  'penalty',
  'minTime',
  'groupTimeout'
)
local maxConcurrent = tonumber(settings[1])
local highWater = tonumber(settings[2])
local nextRequest = tonumber(settings[3])
local strategy = tonumber(settings[4])
local unblockTime = tonumber(settings[5])
local penalty = tonumber(settings[6])
local minTime = tonumber(settings[7])
local groupTimeout = tonumber(settings[8])

if maxConcurrent ~= nil and weight > maxConcurrent then
  return redis.error_reply('OVERWEIGHT:'..weight..':'..maxConcurrent)
end

local reachedHWM = (highWater ~= nil and queueLength == highWater
  and not (
    conditions_check(capacity, weight)
    and nextRequest - now <= 0
  )
)

local blocked = strategy == 3 and (reachedHWM or unblockTime >= now)

if blocked then
  local computedPenalty = penalty
  if computedPenalty == nil then
    if minTime == 0 then
      computedPenalty = 5000
    else
      computedPenalty = 15 * minTime
    end
  end

  local newNextRequest = now + computedPenalty + minTime

  redis.call('hmset', settings_key,
    'unblockTime', now + computedPenalty,
    'nextRequest', newNextRequest
  )

  refresh_expiration(executing_key, running_key, settings_key, now, newNextRequest, groupTimeout)
end

return {reachedHWM, blocked, strategy}
