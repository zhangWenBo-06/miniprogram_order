Component({
  properties: {
    menu: { type: Object, value: {} }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { menu: this.data.menu })
    }
  }
})