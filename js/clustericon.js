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
  cluster.getMarkerClusterer().extend(ClusterIcon, google.maps.OverlayView);

  this.styles_ = styles;
  this.padding_ = opt_padding || 0;
  this.cluster_ = cluster;
  this.center_ = null;
  this.map_ = cluster.getMap();
  this.div_ = null;
  this.sums_ = null;
  this.visible_ = false;

  this.setMap(this.map_);
}


/**
 * Triggers the clusterclick event and zoom's if the option is set.
 */
ClusterIcon.prototype.triggerClusterClick = function() {
  //console.log('triggerClusterClick!');
  var markerClusterer = this.cluster_.getMarkerClusterer();
  var zoom = this.map_.getZoom();
  var mzMap = this.map_.maxZoom || 21;
  var mz = markerClusterer.getMaxZoom();

  //console.log('prev', markerClusterer.prevZoom_);
  // Trigger the clusterclick event.
  google.maps.event.trigger(markerClusterer, 'clusterclick', this.cluster_);

  if (markerClusterer.isZoomOnClick()) {
      // Zoom into the cluster.
      // si ha llegado a un máximo y sigue agrupado
      // es porque los markers son demasiado cercanos entre si
      if (zoom === mzMap || ( mz && zoom > mz )) {
          //console.log('expandir!');
          this.OverlappingMarkerSpiderfier();
          //google.maps.event.trigger(markerClusterer, 'clusterclickLastZoom', this);
      }else {
          this.map_.fitBounds(this.cluster_.getBounds());
      }
  }
};

ClusterIcon.prototype.OverlappingMarkerSpiderfier = function(){
  //config
  this.configOverLap= {
    _2PI: Math.PI * 2,
    _circleFootSeparation: 25,
    _circleStartAngle: Math.PI / 6,
    _spiralFootSeparation: 28,
    _spiralLenghtStart: 11,
    _spiralLengthFactor: 5,
    _circleSpiralSwitchover: 9
  };


  var markerClusterer = this.cluster_.getMarkerClusterer();

  var cluster = this.cluster_,
      markers = cluster.markers_,
      map = this.map_,
      //factor = 0.00001, cuando tiene el máximo zoom = 21
      factor = 0.00001,
      hideMarkersBeforeExpanded = function(){
          var expandedMarkers = markerClusterer.expandedMarkers_;
          if(expandedMarkers.length){
              for (var i = 0, marker; marker = expandedMarkers[i]; i++) {
                  if(marker.active){
                      marker.point.setMap(null);
                      delete marker;
                  }
              }
          }
      },
      showMarkers = function(marker, destination){
        var point = new google.maps.Marker();
        var toLat = marker.position.lat() + factor;
        var toLng = marker.position.lng() + factor;
        var to = new google.maps.LatLng(toLat, toLng);
        point.setPosition(to);
        point.setMap(map);
        markerClusterer.expandedMarkers_.push({point: point, active: true});
        //la suma debe ser proporcional según el maxzoom dado
        //dándose los casos
        //maxzoom = 21 el factor sería que autosume a 0.00001
        //maxzoom = 18 el factor sería que autosume a 0.00011
        factor+=0.00011;
      };

  hideMarkersBeforeExpanded();
  for (var i = 0, marker; marker = markers[i]; i++) {
      //marker.setPosition();
      showMarkers(marker);
      //marker.setMap(this.map_);
  }
  //hide the cluster
  this.hide();
};

ClusterIcon.prototype._spiderfy = function(markerData){
    this.spiderfy = true;
    var numMarkers = markerData.length,
        getBodyPt = function(){
            for(var i = 0; i < numMarkers.length; i++){

            }
        },
        bodyPt = this.ptAverage();

};

ClusterIcon.prototype.generatePtsSpiral = function(count,centerPt){
      var legLength = this.configOverLap['spiralLengthStart'],
          twoPi = this.configOverLap['_2PI'],
          angle = 0,
          pt,
          _results = [];
      for(var i = 0; i < count; i++){
          angle += this.configOverLap['_spiralFootSeparation'] / legLength + i * 0.0005;
          _results.push(new google.maps.Point(centerPt.x + legLength * Math.cos(angle),
                        centerPt.y + legLength * Math.sin(angle)));
          legLength += twoPi * this.configOverLap['_spiralLengthFactor'] / angle;
      }
      return _results;
};

ClusterIcon.prototype.generatePtsCircle = function(count, centerPt){
    var circumference = this.configOverLap['_circleFootSeparation'] * (2 + count),
        twoPi = this.configOverLap['_2PI'],
        legLength = circumference / twoPi,
        angleStep = twoPi / count,
        _results = [];
      for(var i = 0; i < count; i++){
        angle = this.configOverLap['circleStartAngle'] + i * angleStep;
        _results.push(  new google.maps.Point(centerPt.x + legLength * Math.cos(angle),
                                     centerPt.y + legLength * Math.sin(angle)) );
      }
      return _results;
};

ClusterIcon.prototype.llToPt =function(ll) {
    return this.cluster_.getProjection().fromLatLngToDivPixel(ll)
};

ClusterIcon.prototype.ptToLl =function(pt) {
    return this.cluster_.getProjection().fromDivPixelToLatLng(pt)
};

ClusterIcon.prototype.ptAverage = function(pts){
    var sumX = 0,
        sumY = 0,
        numPts = pts.length;
    for (var i = 0; i < pts.length; i++){
        var pt = pts[i];
        sumX += pt.x;
        sumY += pt.y;
    }
    return new google.maps.Point(sumX / numPts, sumY / numPts);
};
/**
 * Adding the cluster icon to the dom.
 * @ignore
 */
ClusterIcon.prototype.onAdd = function() {
  this.div_ = document.createElement('DIV');
  if (this.visible_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.cssText = this.createCss(pos);
    this.div_.innerHTML = this.sums_.text;
  }

  var panes = this.getPanes();
  panes.overlayMouseTarget.appendChild(this.div_);

  var that = this;
  //click en cluster
  google.maps.event.addDomListener(this.div_, 'click', function() {
    that.triggerClusterClick();
  });
};


/**
 * Returns the position to place the div dending on the latlng.
 *
 * @param {google.maps.LatLng} latlng The position in latlng.
 * @return {google.maps.Point} The position in pixels.
 * @private
 */
ClusterIcon.prototype.getPosFromLatLng_ = function(latlng) {
  var pos = this.getProjection().fromLatLngToDivPixel(latlng);
  pos.x -= parseInt(this.width_ / 2, 10);
  pos.y -= parseInt(this.height_ / 2, 10);
  return pos;
};


/**
 * Draw the icon.
 * @ignore
 */
ClusterIcon.prototype.draw = function() {
  if (this.visible_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.top = pos.y + 'px';
    this.div_.style.left = pos.x + 'px';
  }
};


/**
 * Hide the icon.
 */
ClusterIcon.prototype.hide = function() {
  if (this.div_) {
    this.div_.style.display = 'none';
  }
  this.visible_ = false;
};


/**
 * Position and show the icon.
 */
ClusterIcon.prototype.show = function() {
  if (this.div_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.cssText = this.createCss(pos);
    this.div_.style.display = '';
  }
  this.visible_ = true;
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
  if (this.div_ && this.div_.parentNode) {
    this.hide();
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
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
  this.sums_ = sums;
  this.text_ = sums.text;
  this.index_ = sums.index;
  if (this.div_) {
    this.div_.innerHTML = sums.text;
  }

  this.useStyle();
};


/**
 * Sets the icon to the the styles.
 */
ClusterIcon.prototype.useStyle = function() {
  var index = Math.max(0, this.sums_.index - 1);
  index = Math.min(this.styles_.length - 1, index);
  var style = this.styles_[index];
  this.url_ = style['url'];
  this.height_ = style['height'];
  this.width_ = style['width'];
  this.textColor_ = style['textColor'];
  this.anchor_ = style['anchor'];
  this.textSize_ = style['textSize'];
  this.backgroundPosition_ = style['backgroundPosition'];
};


/**
 * Sets the center of the icon.
 *
 * @param {google.maps.LatLng} center The latlng to set as the center.
 */
ClusterIcon.prototype.setCenter = function(center) {
  this.center_ = center;
};


/**
 * Create the css text based on the position of the icon.
 *
 * @param {google.maps.Point} pos The position.
 * @return {string} The css style text.
 */
ClusterIcon.prototype.createCss = function(pos) {
  var style = [];
  style.push('background-image:url(' + this.url_ + ');');
  var backgroundPosition = this.backgroundPosition_ ? this.backgroundPosition_ : '0 0';
  style.push('background-position:' + backgroundPosition + ';');

  if (typeof this.anchor_ === 'object') {
    if (typeof this.anchor_[0] === 'number' && this.anchor_[0] > 0 &&
        this.anchor_[0] < this.height_) {
      style.push('height:' + (this.height_ - this.anchor_[0]) +
          'px; padding-top:' + this.anchor_[0] + 'px;');
    } else {
      style.push('height:' + this.height_ + 'px; line-height:' + this.height_ +
          'px;');
    }
    if (typeof this.anchor_[1] === 'number' && this.anchor_[1] > 0 &&
        this.anchor_[1] < this.width_) {
      style.push('width:' + (this.width_ - this.anchor_[1]) +
          'px; padding-left:' + this.anchor_[1] + 'px;');
    } else {
      style.push('width:' + this.width_ + 'px; text-align:center;');
    }
  } else {
    style.push('height:' + this.height_ + 'px; line-height:' +
        this.height_ + 'px; width:' + this.width_ + 'px; text-align:center;');
  }

  var txtColor = this.textColor_ ? this.textColor_ : 'black';
  var txtSize = this.textSize_ ? this.textSize_ : 11;

  style.push('cursor:pointer; top:' + pos.y + 'px; left:' +
      pos.x + 'px; color:' + txtColor + '; position:absolute; font-size:' +
      txtSize + 'px; font-family:Arial,sans-serif; font-weight:bold');
  return style.join('');
};
