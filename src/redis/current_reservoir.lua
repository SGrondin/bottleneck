local settings_key = KEYS[1]

return tonumber(redis.call('hget', settings_key, 'reservoir'))
