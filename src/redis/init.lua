local clear = tonumber(ARGV[3])
local limiter_version = ARGV[4]
local num_static_argv = 4

if clear == 1 then
  redis.call('del', unpack(KEYS))
end

if redis.call('exists', settings_key) == 0 then
  -- Create
  local args = {'hmset', settings_key}

  for i = num_static_argv + 1, #ARGV do
    table.insert(args, ARGV[i])
  end

  redis.call(unpack(args))
  redis.call('hmset', settings_key,
    'nextRequest', now,
    'lastReservoirRefresh', now,
    'running', 0,
    'done', 0,
    'unblockTime', 0
  )

else
  -- Apply migrations
  local settings = redis.call('hmget', settings_key,
    'id',
    'version'
  )
  local id = settings[1]
  local current_version = settings[2]

  if current_version ~= limiter_version then
    local version_digits = {}
    for k, v in string.gmatch(current_version, "([^.]+)") do
      table.insert(version_digits, tonumber(k))
    end

    -- 2.10.0
    if version_digits[2] < 10 then
      redis.call('hsetnx', settings_key, 'reservoirRefreshInterval', '')
      redis.call('hsetnx', settings_key, 'reservoirRefreshAmount', '')
      redis.call('hsetnx', settings_key, 'lastReservoirRefresh', '')
      redis.call('hsetnx', settings_key, 'done', 0)
      redis.call('hset', settings_key, 'version', '2.10.0')
    end

    -- 2.11.1
    if version_digits[2] < 11 and version_digits[3] < 1 then
      if redis.call('hstrlen', settings_key, 'lastReservoirRefresh') == 0 then
        redis.call('hmset', settings_key,
          'lastReservoirRefresh', now,
          'version', '2.11.1'
        )
      end
    end

    -- 2.14.0
    if version_digits[2] < 14 then
      local old_running_key = 'b_'..id..'_running'
      local old_executing_key = 'b_'..id..'_executing'

      if redis.call('exists', old_running_key) == 1 then
        redis.call('rename', old_running_key, job_weights_key)
      end
      if redis.call('exists', old_executing_key) == 1 then
        redis.call('rename', old_executing_key, job_expirations_key)
      end
      redis.call('hset', settings_key, 'version', '2.14.0')
    end

  end

  process_tick(now, false)
end

local groupTimeout = tonumber(redis.call('hget', settings_key, 'groupTimeout'))
refresh_expiration(0, 0, groupTimeout)

return {}
