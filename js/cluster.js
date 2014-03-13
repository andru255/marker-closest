/**
 * A cluster that contains markers.
 *
 * @param {MarkerClusterer} markerClusterer The markerclusterer that this
 *     cluster is associated with.
 * @constructor
 * @ignore
 */
function Cluster(group, zoom, pointA, pointB) {
    this._group = group;
    this._zoom = zoom;

    this._markers = [];
    this._childClusters = [];
    this._childCount = 0;

    this._iconNeedsUpdate = true;

    if(pointA){
       this.addMarker(pointA);
    }

    if(pointB){
      this.addMarker(pointB);
    }
};

/**
 * Determins if a marker is already added to the cluster.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @return {boolean} True if the marker is already added.
 */
Cluster.prototype.isMarkerAlreadyAdded = function(marker) {
  if (this._markers.indexOf) {
    return this._markers.indexOf(marker) != -1;
  } else {
    for (var i = 0, m; m = this._markers[i]; i++) {
      if (m == marker) {
        return true;
      }
    }
  }
  return false;
};


/**
 * Returns the count of how many child markers we have
 * @return {Number} Total of children
 */
Cluster.prototype.getChildCount = function(){
    return this._childCount;
};

/**
 * Recursively retrieve all child markers of the cluster
 * @return {Array} Markers
 */
Cluster.prototype.getAllChildMarkers = function(storageArray){
    var storageArray = storageArray || [];

    for(var i = this._childClusters.length - 1; i >= 0; i--){
        this._childClusters[i].getAllChildMarkers(storageArray);
    }

    for(var j = this._markers.length - 1; j >=0 ; j++){
        storageArray.push(this._markers[j]);
    }

    return storageArray;
};

/**
 * Add a marker the cluster.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @return {boolean} True if the marker was added.
 */
Cluster.prototype.addMarker = function(marker, isNoteFromChild) {

  var isNotificationFromChildren = (typeof isNoteFromChild === 'undefined')?null: isNoteFromChild;
  this._iconNeedsUpdate = true;
  //this._expandBounds(marker);

  if (this.isMarkerAlreadyAdded(marker)) {
    return false;
  }

  if(marker instanceof Cluster){

    if(!isNotificationFromChildren){
        this._childClusters.push(marker);
        marker._parent = this;
    }
    this._childCount += marker._childCount;

  } else {

      if(!isNotificationFromChildren){
        marker.isAdded = true;
        this._markers.push(marker);
      }
      this._childCount++;

      if (!this.center_) {
        this._center = marker.getPosition();
        //this.calculateBounds_();
      } else {
        if (this.averageCenter_) {
          //var l = this.markers_.length + 1;
          var lat = (this._center.lat() * (l-1) + marker.getPosition().lat()) / l;
          var lng = (this._center.lng() * (l-1) + marker.getPosition().lng()) / l;
          this._center = new google.maps.LatLng(lat, lng);
          //this.calculateBounds_();
        }
      }
  }

  if(this._parent){
      this._parent.addMarker(marker, true);
  }

  //var len = this.markers_.length;
  //if (len < this.minClusterSize_ && marker.getMap() != this.map_) {
    //// Min cluster size not reached so show the marker.
    //marker.setMap(this.map_);
  //}

  //if (len == this.minClusterSize_) {
    //// Hide the markers that were showing.
    //for (var i = 0; i < len; i++) {
      //this.markers_[i].setMap(null);
    //}
  //}

  //if (len >= this.minClusterSize_) {
    //marker.setMap(null);
  //}

  //this.updateIcon();
  return true;
};


/**
 * Returns the marker clusterer that the cluster is associated with.
 *
 * @return {MarkerClusterer} The associated marker clusterer.
 */
Cluster.prototype.getMarkerClusterer = function() {
  return this._group._map;
};


/**
 * Returns the bounds of the cluster.
 *
 * @return {google.maps.LatLngBounds} the cluster bounds.
 */
Cluster.prototype.getBounds = function() {
  var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
  var markers = this.getMarkers();

  for (var i = 0, marker; marker = markers[i]; i++) {
    bounds.extend(marker.getPosition());
  }
  return bounds;
};


/**
 * Removes the cluster
 */
Cluster.prototype.remove = function() {
  this._clusterIcon.remove();
  this._markers.length = 0;
  delete this._markers;

  this._expandedMarkers.length = 0;
  delete this._expandedMarkers;
};


/**
 * Returns the size of cluster
 *
 * @return {number} The cluster size.
 */
Cluster.prototype.getSize = function() {
  return this._markers.length;
};


/**
 * Returns the markers of the cluster
 *
 * @return {Array.<google.maps.Marker>} The markers of cluster.
 */
Cluster.prototype.getMarkers = function() {
  return this._markers;
};

/**
 * Returns the center of the cluster.
 *
 * @return {google.maps.LatLng} The cluster center.
 */
Cluster.prototype.getCenter = function() {
  return this._center;
};


/**
 * Calculated the extended bounds of the cluster with the grid.
 *
 * @private
 */
Cluster.prototype.calculateBounds_ = function() {
  var bounds = new google.maps.LatLngBounds(this._center, this._center);
  this._bounds = this._group._map.getExtendedBounds(bounds);
};


/**
 * Determines if a marker lies in the clusters bounds.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @return {boolean} True if the marker lies in the bounds.
 */
Cluster.prototype.isMarkerInClusterBounds = function(marker) {
  return this._bounds.contains(marker.getPosition());
};


/**
 * Returns the map that the cluster is associated with.
 *
 * @return {google.maps.Map} The map.
 */
Cluster.prototype.getMap = function() {
  return this._group._map;
};


/**
 * Updates the cluster icon
 */
Cluster.prototype.updateIcon = function() {
  console.log('updateIcon!');
  var zoom = this._group._map.getZoom();
  var mz = this._group.getMaxZoom();

  if (mz && zoom > mz) {
    // The zoom is greater than our max zoom so show all the markers in cluster.
    for (var i = 0, marker; marker = this._markers[i]; i++) {
      marker.setMap(this._group._map);
    }
    return;
  }

  if (this._markers.length < this._minClusterSize) {
    // Min cluster size not yet reached.
    this._clusterIcon.hide();
    return;
  }

  var numStyles = this._group.getStyles().length;
  var sums = this._group.getCalculator()(this._markers, numStyles);
  this._clusterIcon.setCenter(this._center);
  this._clusterIcon.setSums(sums);
  this._clusterIcon.show();
};

/**
 *  The function for calculating the cluster icon image.
 *
 *  @param {Array.<google.maps.Marker>} markers The markers in the clusterer.
 *  @param {number} numStyles The number of styles available.
 *  @return {Object} A object properties: 'text' (string) and 'index' (number).
 *  @private
 */
MarkerClusterer.prototype.calculator_ = function(markers, numStyles) {
  var index = 0;
  var count = markers.length;
  var dv = count;
  while (dv !== 0) {
    dv = parseInt(dv / 10, 10);
    index++;
  }

  index = Math.min(index, numStyles);
  return {
    text: count,
    index: index
  };
};

/**
 * Set the calculator function.
 *
 * @param {function(Array, number)} calculator The function to set as the
 *     calculator. The function should return a object properties:
 *     'text' (string) and 'index' (number).
 *
 */
MarkerClusterer.prototype.setCalculator = function(calculator) {
  this.calculator_ = calculator;
};


/**
 * Get the calculator function.
 *
 * @return {function(Array, number)} the calculator function.
 */
MarkerClusterer.prototype.getCalculator = function() {
  return this.calculator_;
};
