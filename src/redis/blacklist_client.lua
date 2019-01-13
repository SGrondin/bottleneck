local blacklist = ARGV[3]

redis.call('zadd', client_last_seen_key, 0, blacklist)

return {}
