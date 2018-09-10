local refresh_running = function (executing_key, running_key, settings_key, now)

  local id = redis.call('hget', settings_key, 'id')
  redis.call('publish', 'b_'..id, 'freed:')

  local expired = redis.call('zrangebyscore', executing_key, '-inf', '('..now)

  if #expired == 0 then
    return tonumber(redis.call('hget', settings_key, 'running'))
  else
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

    local incr = -total
    if total == 0 then
      incr = 0
    else
      redis.call('hincrby', settings_key, 'done', total)
    end

    return tonumber(redis.call('hincrby', settings_key, 'running', incr))
  end

end
