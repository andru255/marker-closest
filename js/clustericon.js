/**
 * A cluster icon
 *
 * @param {Cluster} cluster The cluster to be associated with.
 * @param {Object} styles An object that has style properties:
 *     'url': (string) The image url.
 *     'height': (number) The image height.
 *     'width': (number) The image width.
 *     'anchor': (Array) The anchor position of the label text.
 *     'textColor': (string) The text color.
 *     'textSize': (number) The text size.
 *     'backgroundPosition: (string) The background position x, y.
 * @param {number=} opt_padding Optional padding to apply to the cluster icon.
 * @constructor
 * @extends google.maps.OverlayView
 * @ignore
 */
function ClusterIcon(cluster, styles, opt_padding) {
  cluster._group.extend(ClusterIcon, google.maps.OverlayView);

  this._styles = styles;
  this._padding = opt_padding || 0;
  this._cluster = cluster;
  this._center = null;
  this._map = cluster.getMap();
  this._div = null;
  this._sums = null;
  this._visible = false;
  this.setMap(this._map);

};

/**
 * Adding the cluster icon to the dom.
 * @ignore
 */
ClusterIcon.prototype.onAdd = function() {
  this._div = document.createElement('DIV');

  if (this._visible) {
    var pos = this._getPosFromLatLng(this._center);
    this._div.style.cssText = this.createCss(pos);
    this._div.innerHTML = this._sums.text;
  }

  var panes = this.getPanes();
  panes.overlayMouseTarget.appendChild(this._div);

  //var that = this;
  //click en cluster
  //google.maps.event.addDomListener(this.div_, 'click', function() {
    //that.triggerClusterClick();
  //});
};


/**
 * Returns the position to place the div dending on the latlng.
 *
 * @param {google.maps.LatLng} latlng The position in latlng.
 * @return {google.maps.Point} The position in pixels.
 * @private
 */
ClusterIcon.prototype._getPosFromLatLng = function(latlng) {
  var pos = this.getProjection().fromLatLngToDivPixel(latlng);
  pos.x -= parseInt(this._width / 2, 10);
  pos.y -= parseInt(this._height / 2, 10);
  return pos;
};


/**
 * Draw the icon.
 * @ignore
 */
ClusterIcon.prototype.draw = function() {
  if (this._visible) {
    var pos = this._getPosFromLatLng(this._center);
    this._div.style.top = pos.y + 'px';
    this._div.style.left = pos.x + 'px';
  }
};


/**
 * Hide the icon.
 */
ClusterIcon.prototype.hide = function() {
  if (this._div) {
    this._div.style.display = 'none';
  }
  this._visible = false;
};


/**
 * Position and show the icon.
 */
ClusterIcon.prototype.show = function() {
  if (this._div) {
    var pos = this._getPosFromLatLng(this._center);
    this._div.style.cssText = this.createCss(pos);
    this._div.style.display = '';
  }
  this._visible = true;
};


/**
 * Remove the icon from the map
 */
ClusterIcon.prototype.remove = function() {
  this.setMap(null);
};


/**
 * Implementation of the onRemove interface.
 * @ignore
 */
ClusterIcon.prototype.onRemove = function() {
  if (this._div && this._div.parentNode) {
    this.hide();
    this._div.parentNode.removeChild(this._div);
    this._div = null;
  }
};


/**
 * Set the sums of the icon.
 *
 * @param {Object} sums The sums containing:
 *   'text': (string) The text to display in the icon.
 *   'index': (number) The style index of the icon.
 */
ClusterIcon.prototype.setSums = function(sums) {
  this._sums = sums;
  this._text = sums.text;
  this._index = sums.index;
  if (this._div) {
    this._div.innerHTML = sums.text;
  }

  this.useStyle();
};


/**
 * Sets the icon to the the styles.
 */
ClusterIcon.prototype.useStyle = function() {
  var index = Math.max(0, this._sums.index - 1);
  index = Math.min(this._styles.length - 1, index);
  var style = this._styles[index];
  this._url = style['url'];
  this._height = style['height'];
  this._width = style['width'];
  this._textColor = style['textColor'];
  this._anchor = style['anchor'];
  this._textSize = style['textSize'];
  this._backgroundPosition = style['backgroundPosition'];
};


/**
 * Sets the center/position of the icon.
 *
 * @param {google.maps.LatLng} center The latlng to set as the center.
 */
ClusterIcon.prototype.setPosition = function(center) {
  this._center = center;
};


/**
 * Create the css text based on the position of the icon.
 *
 * @param {google.maps.Point} pos The position.
 * @return {string} The css style text.
 */
ClusterIcon.prototype.createCss = function(pos) {
  var style = [];
  style.push('background-image:url(' + this._url + ');');
  var backgroundPosition = this._backgroundPosition ? this._backgroundPosition : '0 0';
  style.push('background-position:' + backgroundPosition + ';');

  if (typeof this._anchor === 'object') {
    if (typeof this._anchor[0] === 'number' && this._anchor[0] > 0 &&
        this._anchor[0] < this._height) {
      style.push('height:' + (this._height - this._anchor[0]) +
          'px; padding-top:' + this._anchor[0] + 'px;');
    } else {
      style.push('height:' + this._height + 'px; line-height:' + this._height +
          'px;');
    }
    if (typeof this._anchor[1] === 'number' && this._anchor[1] > 0 &&
        this._anchor[1] < this._width) {
      style.push('width:' + (this._width - this._anchor[1]) +
          'px; padding-left:' + this._anchor[1] + 'px;');
    } else {
      style.push('width:' + this._width + 'px; text-align:center;');
    }
  } else {
    style.push('height:' + this._height + 'px; line-height:' +
        this._height + 'px; width:' + this._width + 'px; text-align:center;');
  }

  var txtColor = this._textColor ? this._textColor : 'black';
  var txtSize = this._textSize ? this._textSize : 11;

  style.push('cursor:pointer; top:' + pos.y + 'px; left:' +
      pos.x + 'px; color:' + txtColor + '; position:absolute; font-size:' +
      txtSize + 'px; font-family:Arial,sans-serif; font-weight:bold');
  return style.join('');
};
