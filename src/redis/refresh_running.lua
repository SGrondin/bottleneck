local refresh_running = function (executing_key, running_key, settings_key, now)

  local expired = redis.call('zrangebyscore', executing_key, '-inf', '('..now)

  if #expired == 0 then
    return redis.call('hget', settings_key, 'running')
  else
    redis.call('zremrangebyscore', executing_key, '-inf', '('..now)

    local args = {'hmget', running_key}
    for i = 1, #expired do
      table.insert(args, expired[i])
    end

    local weights = redis.call(unpack(args))

    args[1] = 'hdel'
    local deleted = redis.call(unpack(args))

    local total = 0
    for i = 1, #weights do
      total = total + (tonumber(weights[i]) or 0)
    end
    local incr = -total
    if total == 0 then
      incr = 0
    else
      local id = redis.call('hget', settings_key, 'id')
      redis.call('publish', 'bottleneck_'..id, 'freed:'..total)
    end

    return redis.call('hincrby', settings_key, 'running', incr)
  end

end
