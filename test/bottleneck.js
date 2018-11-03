if (process.env.BUILD === 'bundle') {
  module.exports = require('../es5.js')
} else {
  module.exports = require('../lib/index.js')
}
