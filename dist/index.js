
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./onekey-connector.cjs.production.min.js')
} else {
  module.exports = require('./onekey-connector.cjs.development.js')
}
