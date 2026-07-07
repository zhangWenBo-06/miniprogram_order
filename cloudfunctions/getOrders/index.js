const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  const isAdmin = userRes.data.length > 0 && userRes.data[0].role === 'admin'

  // Admin 看全部，普通用户只看自己的
  const where = isAdmin ? {} : { _openid: OPENID }

  const res = await db.collection('orders')
    .where(where)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  return { orders: res.data, isAdmin }
}