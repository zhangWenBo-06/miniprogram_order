const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { menuId } = event
  if (!menuId) {
    return { success: false, error: '缺少menuId' }
  }

  // 软删除
  await db.collection('menus').doc(menuId).update({ data: { available: false } })
  return { success: true }
}