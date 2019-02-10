local blacklist = ARGV[num_static_argv + 1]

redis.call('zadd', client_last_seen_key, 0, blacklist)

return {}
