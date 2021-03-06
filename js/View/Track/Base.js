define([
  'dojo/_base/declare',
  'dojo/on',
  'dojo/mouse',
  'dojo/_base/event',
  'dijit/Dialog',
  'JBrowse/Util',
  'JBrowse/Store/SeqFeature/BigBed',
  'JBrowse/View/Track/_FeatureDetailMixin',
], function (declare, on, mouse, domEvent, Dialog, Util, BigBed, FeatureDetailMixin) {
  return declare(FeatureDetailMixin, {
    constructor: function (args) {
      if (this.config.bigbed) {
        this.highlightStore = new BigBed(
          Object.assign({}, this.config.bigbed, args),
        )
      } else {
        const conf = this.config.storeConf
        const CLASS = dojo.global.require(conf.storeClass)
        const newConf = Object.assign({}, args, conf)
        newConf.config = Object.assign({}, args.config, conf)
        this.highlightStore = new CLASS(newConf)
      }
    },
    _defaultConfig: function () {
      return Util.deepUpdate(dojo.clone(this.inherited(arguments)), {
        highlightColor: '#f0f2',
        indicatorColor: '#f0f',
        indicatorHeight: 3,
        broaden: 0,
        showLabels: false,
        style: {
          label: (feature, track) => feature.get('name') || feature.get('id'),
        },
        onHighlightClick: feature =>
          new Dialog({
            content: this.defaultFeatureDetail(this, feature, null, null, null),
          }).show(),
        onHighlightRightClick: () => {},
      })
    },

    _postDraw: function (scale, leftBase, rightBase, block, canvas) {
      this.highlightStore.getFeatures(
        { ref: this.browser.refSeq.name, start: leftBase, end: rightBase },
        feature => {
          const s = block.bpToX(
            Math.max(
              feature.get('start') - this.config.broaden,
              block.startBase,
            ),
          )
          const e = block.bpToX(
            Math.min(feature.get('end') + this.config.broaden, block.endBase),
          )

          const ret = dojo.create(
            'div',
            {
              style: {
                left: `${s}px`,
                width: `${e - s}px`,
                height: canvas.style.height,
                top: 0,
                zIndex: 10000,
                position: 'absolute',
                backgroundColor:
                  typeof this.config.highlightColor === 'function'
                    ? this.config.highlightColor(feature, this)
                    : this.config.highlightColor,
              },
            },
            block.domNode,
          )
          const indicator = dojo.create(
            'div',
            {
              style: {
                left: `${s}px`,
                width: `${e - s}px`,
                height: `${this.config.indicatorHeight}px`,
                zIndex: 10000,
                top: canvas.style.height,
                position: 'absolute',
                backgroundColor:
                  typeof this.config.indicatorColor === 'function'
                    ? this.config.indicatorColor(feature, this)
                    : this.config.indicatorColor,
              },
            },
            block.domNode,
          )
          // draw label
          const label =
            this.config.showLabels && this.config.style.label(feature, this)
          let domLabel
          if (label) {
            const textLeft = block.bpToX(
              feature.get('start') - this.config.broaden,
            )
            domLabel = dojo.create(
              'div',
              {
                style: {
                  left: `${textLeft}px`,
                  top: 0,
                  zIndex: 10000,
                  position: 'absolute',
                },
                innerHTML: this.config.style.label(feature, this),
              },
              block.domNode,
            )
          }

          const effectiveCallback = event => {
            if (mouse.isRight(event)) {
              this.getConf('onHighlightRightClick', [feature, this, event])
            } else {
              this.getConf('onHighlightClick', [feature, this, event])
            }
          event.stopPropagation()
          }

          const contextCallback = event => {
              event = domEvent.fix(event)
              domEvent.stop(event)
          }

          on(indicator, 'contextmenu', contextCallback)
          on(indicator, 'mousedown', effectiveCallback)
          on(ret, 'mousedown', effectiveCallback)
            on(ret, 'contextmenu', contextCallback)
          if (domLabel) {
            on(domLabel, 'mousedown', effectiveCallback)
              on(domLabel, 'contextmenu', contextCallback)
          }

        },
        () => {},
        error => {
          console.error(error)
        },
      )
    },
  })
})
