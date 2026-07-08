const CATEGORIES = {
  drink: {
    label: '🥤 奶茶',
    subs: [
      { key: 'heytea', label: '喜茶' },
      { key: 'mxbc', label: '蜜雪冰城' },
      { key: 'guming', label: '古茗' },
      { key: 'chabaidao', label: '茶百道' },
      { key: 'bwchaji', label: '霸王茶姬' },
      { key: 'nayuki', label: '奈雪的茶' },
      { key: 'yidiandian', label: '一点点' },
      { key: 'coco', label: 'CoCo都可' },
      { key: 'hushang', label: '沪上阿姨' },
      { key: 'shuyi', label: '书亦烧仙草' },
      { key: 'other', label: '其他' }
    ]
  },
  meal: {
    label: '🍱 餐食',
    subs: [
      { key: 'kfc', label: '肯德基' },
      { key: 'mcdonalds', label: '麦当劳' },
      { key: 'wallace', label: '华莱士' },
      { key: 'haidilao', label: '海底捞' },
      { key: 'zhangliang', label: '张亮麻辣烫' },
      { key: 'yangguofu', label: '杨国福麻辣烫' },
      { key: 'zhengxin', label: '正新鸡排' },
      { key: 'shaxian', label: '沙县小吃' },
      { key: 'huangmenji', label: '黄焖鸡米饭' },
      { key: 'lanzhou', label: '兰州拉面' },
      { key: 'other', label: '其他' }
    ]
  },
  snack: {
    label: '🍿 零食',
    subs: [
      { key: 'liangpin', label: '良品铺子' },
      { key: 'squirrel', label: '三只松鼠' },
      { key: 'baicaowei', label: '百草味' },
      { key: 'zhouheiya', label: '周黑鸭' },
      { key: 'juewei', label: '绝味鸭脖' },
      { key: 'laiyifen', label: '来伊份' },
      { key: 'haoliyou', label: '好丽友' },
      { key: 'lays', label: '乐事' },
      { key: 'other', label: '其他' }
    ]
  }
}

function getCategoryLabel(key) {
  return CATEGORIES[key] ? CATEGORIES[key].label : key
}

function getSubcategoryLabel(catKey, subKey) {
  if (!subKey) return ''
  const subs = CATEGORIES[catKey] ? CATEGORIES[catKey].subs : []
  const found = subs.find(s => s.key === subKey)
  return found ? found.label : subKey
}

function getSubcategories(catKey) {
  return CATEGORIES[catKey] ? CATEGORIES[catKey].subs : []
}

module.exports = { CATEGORIES, getCategoryLabel, getSubcategoryLabel, getSubcategories }