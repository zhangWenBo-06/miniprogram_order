const { getSubcategoryLabel } = require('../../utils/categories')

Component({
  properties: {
    menu: { type: Object, value: {} }
  },
  data: {
    brandLabel: ''
  },
  observers: {
    'menu.category, menu.subcategory': function(cat, sub) {
      const label = sub ? getSubcategoryLabel(cat, sub) : ''
      this.setData({ brandLabel: label })
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { menu: this.data.menu })
    }
  }
})