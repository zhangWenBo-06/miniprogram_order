const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { category } = event
  const where = { available: true }
  if (category) {
    where.category = category
  }
  const res = await db.collection('menus')
    .where(where)
    .orderBy('createdAt', 'desc')
    .get()
  return { menus: res.data }
}