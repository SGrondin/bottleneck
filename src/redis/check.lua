local weight = tonumber(ARGV[3])

local capacity = process_tick(now, false)[1]
local nextRequest = tonumber(redis.call('hget', settings_key, 'nextRequest'))

return conditions_check(capacity, weight) and nextRequest - now <= 0
