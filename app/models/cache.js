/* @flow */
import Redis from 'ioredis'
import cache from 'config/cache'

export default new Redis(cache)
