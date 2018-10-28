if (process.env.BUILD === 'bundle') {
  module.exports = require('../bundle.js')
} else {
  module.exports = require('../lib/index.js')
}
