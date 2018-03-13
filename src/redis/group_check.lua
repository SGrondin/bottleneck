local settings_key = KEYS[1]

return not (redis.call('exists', settings_key) == 1)
