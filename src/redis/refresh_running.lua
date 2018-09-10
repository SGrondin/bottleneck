local refresh_running = function (executing_key, running_key, settings_key, now)

  local settings = redis.call('hmget', settings_key,
    'id',
    'running',
    'maxConcurrent'
  )
  local id = settings[1]
  local running = tonumber(settings[2])
  local maxConcurrent = tonumber(settings[3])

  local expired = redis.call('zrangebyscore', executing_key, '-inf', '('..now)

  if #expired > 0 then
    redis.call('zremrangebyscore', executing_key, '-inf', '('..now)

    local make_batch = function ()
      return {'hmget', running_key}
    end

    local flush_batch = function (batch)
      local weights = redis.call(unpack(batch))
      batch[1] = 'hdel'
      local deleted = redis.call(unpack(batch))

      local sum = 0
      for i = 1, #weights do
        sum = sum + (tonumber(weights[i]) or 0)
      end
      return sum
    end

    local total = 0
    local batch_size = 1000

    for i = 1, #expired, batch_size do
      local batch = make_batch()
      for j = i, math.min(i + batch_size - 1, #expired) do
        table.insert(batch, expired[j])
      end
      total = total + flush_batch(batch)
    end

    if total > 0 then
      redis.call('hincrby', settings_key, 'done', total)
      running = tonumber(redis.call('hincrby', settings_key, 'running', -total))
      redis.call('publish', 'b_'..id, 'freed:'..(maxConcurrent and (maxConcurrent - running) or '0'))
    end
  end

  return running
end
