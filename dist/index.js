
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./ethereum2-connector.cjs.production.min.js')
} else {
  module.exports = require('./ethereum2-connector.cjs.development.js')
}
