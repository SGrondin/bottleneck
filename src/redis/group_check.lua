local settings_key = KEYS[1]

return redis.call('hget', settings_key, 'nextRequest')
