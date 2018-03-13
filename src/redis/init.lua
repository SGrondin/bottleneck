local settings_key = KEYS[1]
local running_key = KEYS[2]
local executing_key = KEYS[3]

local clear = tonumber(ARGV[1])

if clear == 1 then
  redis.call('del', settings_key, running_key, executing_key)
end

if redis.call('exists', settings_key) == 0 then
  local args = {'hmset', settings_key}

  for i = 2, #ARGV do
    table.insert(args, ARGV[i])
  end

  redis.call(unpack(args))
end

local groupTimeout = tonumber(redis.call('hget', settings_key, 'groupTimeout'))
refresh_expiration(executing_key, running_key, settings_key, 0, 0, groupTimeout)

return {}
