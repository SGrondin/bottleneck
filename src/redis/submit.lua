local queueLength = tonumber(ARGV[3])
local weight = tonumber(ARGV[4])

local capacity = process_tick(now, false)[1]

local settings = redis.call('hmget', settings_key,
  'id',
  'maxConcurrent',
  'highWater',
  'nextRequest',
  'strategy',
  'unblockTime',
  'penalty',
  'minTime',
  'groupTimeout'
)
local id = settings[1]
local maxConcurrent = tonumber(settings[2])
local highWater = tonumber(settings[3])
local nextRequest = tonumber(settings[4])
local strategy = tonumber(settings[5])
local unblockTime = tonumber(settings[6])
local penalty = tonumber(settings[7])
local minTime = tonumber(settings[8])
local groupTimeout = tonumber(settings[9])

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

  redis.call('publish', 'b_'..id, 'blocked:')

  refresh_expiration(now, newNextRequest, groupTimeout)
end

return {reachedHWM, blocked, strategy}
