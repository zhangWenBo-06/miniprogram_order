const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { menuId, ...updates } = event
  if (!menuId) {
    return { success: false, error: '缺少menuId' }
  }

  delete updates.menuId
  if (Object.keys(updates).length === 0) {
    return { success: false, error: '没有要更新的字段' }
  }

  await db.collection('menus').doc(menuId).update({ data: updates })
  return { success: true }
}