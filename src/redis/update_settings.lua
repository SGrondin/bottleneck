local settings_key = KEYS[1]

local args = {'hmset', settings_key}

for i = 1, #ARGV do
  table.insert(args, ARGV[i])
end

redis.call(unpack(args))

return {}
