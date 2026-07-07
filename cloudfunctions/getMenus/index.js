const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { category } = event

  // Detect admin: admins can see all items including unavailable (soft-deleted)
  const { OPENID } = cloud.getWXContext()
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  const isAdmin = userRes.data.length > 0 && userRes.data[0].role === 'admin'

  const where = {}
  if (!isAdmin) {
    where.available = true
  }
  if (category) {
    where.category = category
  }

  const res = await db.collection('menus')
    .where(where)
    .orderBy('createdAt', 'desc')
    .get()
  return { menus: res.data }
}