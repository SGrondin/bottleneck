local conditions_check = function (weight, maxConcurrent, running, reservoir)
  return (
    (maxConcurrent == nil or running + weight <= maxConcurrent) and
    (reservoir == nil or reservoir - weight >= 0)
  )
end
