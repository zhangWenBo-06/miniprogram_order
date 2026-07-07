const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { name, category, reason } = event

  if (!name || !category) {
    return { success: false, error: '名称和分类不能为空' }
  }

  await db.collection('suggestions').add({
    data: {
      _openid: OPENID,
      name,
      category,
      reason: reason || '',
      status: 'pending',
      createdAt: db.serverDate()
    }
  })

  return { success: true }
}