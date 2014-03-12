function MarkerClusterer(map, opt_markers, opts){
    //CONSTANTS
    this.GM = google.maps;
    this.GE = this.GM.event;
    this.map_ = map;

    //extend to google.maps.OverlayView()
    this.extend(MarkerClusterer, this.GM.OverlayView);

    //defaults
    var defaults = {
        //cluster properties
        maxClusterRadio: 80,
        minClusterSize: 2,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        zoomOnClick: true,
        singleMarkerMode: false,
        disableClusteringAtZoom: null,
        // Setting this to false prevents the removal of any clusters outside
        // of the viewpoint, which is the default behaviour for performance reasons.
        removeOutsideVisibleBounds: true,
        //Whether to animate adding markers after adding the MarkerClusterGroup to the map
        // If you are adding individual markers set to true,
        // if adding bulk markers leave false for massive performance gains.
        animateAddingMarkers: false,
        //Increase to increase the distance away that spiderfied markers appear from the center
        spiderfyDistanceMultiplier: 1,
        // When bulk adding layers, adds markers in chunks.
        // Means addLayers may not add all the layers in the call,
        // others will be loaded during setTimeouts
        chunkedLoading: false,
        chunkInterval:200,
        chunkDelay: 50,
        chunkProgress: null,
        //
        polygonOptions:{},
        //
        isAverageCenter: false,
        styles_: [],
        imagePath: 'http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/' +
                   'images/m',
        imageExtension: 'png'
    };

    /**
     * @type {Array.<google.maps.Marker>}
     * @private
     */
    this.markers_ = [];

    /**
     * @type {Array.<Cluster>}
     */
    this.clusters_ = [];

    this.sizes = [53, 56, 66, 78, 90];

    /**
     * @private
     */
    this.styles_ = [];

    this._inZoomAnimation = 0;
    this._needsClustering = [];
    this._needsRemoving = [];
    this._currentShownBounds = null;

    /**
     * @type {boolean}
     * @private
     */
    this.load_ = false;

    /**
    * @type {boolean}
    * @private
    */
    this.averageCenter_ = false;

    //markers
    this.opt_markers = opt_markers;
    //override default properties
    this.settings = this.merge(defaults, opts);
    // Explicity call setMap on this overlay
    // because need call the inherits events of google.maps.Overlayview
    this.setMap(map);
    //setup the styles
    this.setupStyles();
    //load the events with the map
    this.bindEvents();
};

/**
 * Extends a objects PROTOTYPE by anothers.
 *
 * @param {Object} obj1 The object to be extended.
 * @param {Object} obj2 The object to extend with.
 * @return {Object} The new extended object.
 * @ignore
 */
MarkerClusterer.prototype.extend = function(obj1, obj2) {
  return (function(object) {
    for(var ProtoProperty in object.prototype){
      this.prototype[ProtoProperty] = object.prototype[ProtoProperty];
    };
    return this;
  }).apply(obj1, [obj2]);
};

/**
 * Merge a objects LITERALS by anothers.
 *
 * @param {Object} obj1 The object to be extended.
 * @param {Object} obj2 The object to extend with.
 * @return {Object} The new extended object.
 * @ignore
 */
MarkerClusterer.prototype.merge = function(obj1, obj2) {
  return (function(object) {

    for (var property in object) {
      this[property] = object[property];
    };

    return this;
  }).apply(obj1, [obj2]);
};

/**
 * Implementaion of the interface method.
 * its REQUIRED when the Markerclusterer is extended of google.maps.Overlayview
 * @ignore
 */
MarkerClusterer.prototype.onAdd = function() {

  this.div_ = document.createElement('DIV');

  var panes = this.getPanes();
  panes.overlayMouseTarget.appendChild(this.div_);
  log('div_', this);

  this._onLoad(true, function(that){
      that.dispatchMarkers_();
  });
};

/**
 * Sets up the styles object.
 *
 * @private
 */
MarkerClusterer.prototype.setupStyles = function() {
  var that = this.settings;
  if (that.styles_.length) {
    return;
  }

  for (var i = 0, size; size = this.sizes[i]; i++) {
    that.styles_.push({
      url: that.imagePath + (i + 1) + '.' + that.imageExtension,
      height: size,
      width: size
    });
  }
};

/**
 * Implementaion of the interface method.
 * its REQUIRED when the Markerclusterer is extended of google.maps.Overlayview
 * @ignore
 */
MarkerClusterer.prototype.draw = function() {};

MarkerClusterer.prototype.bindEvents = function(){
    var that = this;
    //load the map

    //when change the zoom of map
    this.GE.addListener(this.map_, 'zoom_changed', function(){

        //get the current zoom
        var zoom = that.map_.getZoom(),
            //set the minZoom or 0 to minZoom variable
            minZoom = that.settings.minZoom || 0,
            //calculate the maxZoom
            maxZoom = Math.min(that.map_.maxZoom || 100,
                               that.map_.mapTypes[that.map_.getMapTypeId()].maxZoom);

        zoom = Math.min(Math.max(zoom, minZoom), maxZoom);

        if(that.prevZoom_ != zoom) {
            that.prevzoom_ = zoom;
        }

        that.zoomChangedCluster && that.zoomChangedCluster.apply(this);
    });

    //when is idle
    this.GE.addListener(this.map_, 'idle', function(){
        that.idleCluster && that.idleCluster.apply(this);
    });

};

MarkerClusterer.prototype.addMarkers = function(markers){
    var chunked = this.settings.chunkedLoading,
        chunkInterval = this.settings.chunkInterval,
        chunkProgress = this.settings.chunkProgress,
        marker = null,
        that = this;

    log('that', that);
    if(markers.length){
        var offset = 0,
            started = (new Date()).getTime();

        var process = function(){
            var start = (new Date()).getTime();

            for(;offset < markers.length; offset++){
                if(chunked && offset % 200 === 0){
                    //every couple hundred markers, instrument the time elapsed since processing started:
                    var elapsed = (new Date()).getTime() - start;
                    if(elapsed > chunkInterval){
                        break;
                    }
                }

                marker = markers[offset];
                log('marker', marker);
                //that.pushMarkerTo_(marker, that.maxZoom);
            }

            if(chunkProgress){
                //report the progress
                chunkProgress(offset, markers.length, (new Date()).getTime() - started);
            }

            if(offset === markers.length){

            } else {
                setTimeout(process, this.settings.chunkDelay);
            }

        };
        process();

    } else if (Object.keys(markers).length){
        for(var marker in markers){
            this.pushMarkerTo_(markers[marker], that.maxZoom);
        }
    }
};

/**
 * Push the marker and behaviour with the map and clusters.
 *
 * @private
 */
MarkerClusterer.prototype.pushMarkerTo_ = function(marker, zoom){
    marker.isAdded = false;
    this.markers_.push(marker);

    var gridClusters = this._gridClusters,
        gridUnclustered = this._gridUnClustered,
        markerPoint, z, closest;

    for(;zoom >=1; zoom--){
        markerPoint = latlngToPoint( this.map_, marker.getPosition(), zoom);
        //try find a cluster closest
        closest = gridClusters[zoom].getNearObject(markerPoint);
        if(closest){
            closest._addChild(marker);
            marker._parent = closest;
            return;
        }

        //try find a markers closest for form a new cluster with these
        closest = gridUnclustered[zoom].getNearObject(markerPoint);
        if(closest){
            var parent = closest._parent;
            if(parent){
                this._remove(closest, false);
            }
            //create new Cluster with these 2 in it
            var newCluster = new Cluster(this, zoom, closest, marker);
            gridClusters[zoom].addObject(newCluster,latlngToPoint(this.map_, newCluster.getCenter(), zoom));
            closest._parent = newCluster;
            marker._parent = newCluster;
            //first we create a intermediate parent cluster
            var lastParent = newCluster;
            for(z = zoom -1; z > parent._zoom; z--){
                lastParent = new Cluster(this, z, lastParent);
                gridClusters[z].addObject(lastParent,latlngToPoint(this.map_, newCluster.getCenter(), zoom));
            }
        }
        //Didn't manage to cluster in at this zoom, record us as a marker here
        gridUnclustered[zoom].addObject(marker, markerPoint);
    }
    //find the lowest zoom lovel to slot one in
    this.createClusters_();
};

/**
 * Creates the clusters.
 *
 * @private
 */
MarkerClusterer.prototype.createClusters_ = function() {
  if (!this.load_) {
    return;
  }

  // Get our current map view bounds.
  // Create a new bounds object so we don't affect the map.
  var mapBounds = new google.maps.LatLngBounds(this.map_.getBounds().getSouthWest(),
      this.map_.getBounds().getNorthEast());
  var bounds = this.getExtendedBounds(mapBounds);

  for (var i = 0, marker; marker = this.markers_[i]; i++) {
    if (!marker.isAdded && this.isMarkerInBounds_(marker, bounds)) {
      this.addToClosestCluster_(marker);
    }
  }
};

/**
 * Append a new single marker
 *
 * @private
 */
//MarkerClusterer.prototype.addMarker = function(marker){
    //this.pushMarkerTo_(marker);
//};

MarkerClusterer.prototype._generateInitialClusters = function(marker){
    var maxZoom = this.maxZoom,
        radio = this.settings.maxClusterRadio,
        radioFn = radio;

    if(typeof radio !== "function"){
        radioFn = function(){ return radio;};
    }

    if(this.settings.disableClusteringAtZoom){
        maxZoom = this.settings.disableClusteringAtZoom - 1;
    }

    this._gridClusters = {};
    this._gridUnClustered = {};

    //setup DistanceGrids for each zoom
    for(var zoom = maxZoom; zoom >=0; zoom--){
        this._gridClusters[zoom] = new DistanceGrid(radioFn(zoom));
        this._gridUnClustered[zoom] = new DistanceGrid(radioFn(zoom));
    }

    this._topClusterer = new Cluster(this, -1);
};
/**
 * Sets the clusterer's state loaded.
 *
 * @param {boolean} state The state.
 * @private
 */
MarkerClusterer.prototype._onLoad = function(state, fn) {
  if (!this.load_) {
    this.load_ = state;
    fn && fn.apply(this,[this]);
  }
};

/**
 * Calculates the distance between two latlng locations in km.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {google.maps.LatLng} p1 The first lat lng point.
 * @param {google.maps.LatLng} p2 The second lat lng point.
 * @return {number} The distance between the two points in km.
 * @private
*/
MarkerClusterer.prototype.distanceBetweenPoints_ = function(p1, p2) {
  if (!p1 || !p2) {
    return 0;
  }

  var R = 6371; // Radius of the Earth in km
  var dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
  var dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
};

/**
 * Add a marker to a cluster, or creates a new cluster.
 *
 * @param {google.maps.Marker} marker The marker to add.
 * @private
 */
//MarkerClusterer.prototype.addToClosestCluster_ = function(marker){
    //var distance = 40000;
    //var clusterAddTo = null;
    //var pos = marker.getPosition();

    //for(var i = 0, cluster; cluster = this.clusters_[i]; i++){
        //var center = cluster.getCenter();
        //if(center){
            //var d = this.distanceBetweenPoints_(center, marker.getPosition());
            //if(d < distance){
                //distance = d;
                //clusterAddTo = cluster;
            //}
        //}
    //}

    //if(clusterAddTo && clusterAddTo.isMarkerInClusterBounds(marker)){
        //clusterAddTo.addMarker(marker);
    //} else {
        //var cluster = new Cluster(this);
        //cluster.addMarker(marker);
        //this.clusters_.push(cluster);
    //}
//};

MarkerClusterer.prototype.addToClosestCluster_ = function(marker, zoom){
    var gridClusters = this._gridClusters,
        gridUnclustered = this._gridUnClustered,
        projection = this.getProjection(),
        markerPoint, z;

    //find the lowest zoom level to slot this one in
    //for(;zoom >=0; zoom--){
        //markerPoint = projection.fromLatLngToDivPixel(marker.getPosition(), zoom);
    //}
};

MarkerClusterer.prototype.getExtendedBounds = function(bounds){
    var projection = this.getProjection();

    // Turn the bounds into latlng.
    var tr = new this.GM.LatLng(bounds.getNorthEast().lat(),
        bounds.getNorthEast().lng());

    var bl = new this.GM.LatLng(bounds.getSouthWest().lat(),
        bounds.getSouthWest().lng());

    // Convert the points to pixels and the extend out by the grid size.
    var trPix = projection.fromLatLngToDivPixel(tr);
    trPix.x += this.settings.maxClusterRadio;
    trPix.y -= this.settings.maxClusterRadio;

    var blPix = projection.fromLatLngToDivPixel(bl);
    blPix.x -= this.settings.maxClusterRadio;
    blPix.y += this.settings.maxClusterRadio;

    // Convert the pixel points back to LatLng
    var ne = projection.fromDivPixelToLatLng(trPix);
    var sw = projection.fromDivPixelToLatLng(blPix);

    // Extend the bounds to contain the new bounds.
    bounds.extend(ne);
    bounds.extend(sw);

    return bounds;
};

/*
 * */
MarkerClusterer.prototype.isMarkerInBounds_ = function(marker, bounds){
    return bounds.contains(marker.getPosition());
};

MarkerClusterer.prototype.dispatchMarkers_ = function(){
    //if not ready
    if(!this.load_){
        return;
    }

    //storage range of zoom
    this.minZoom = this.map_.minZoom || 0;
    this.maxZoom = this.map_.mapTypes[this.map_.getMapTypeId()].maxZoom;

    if (!this._gridClusters) {
        this._generateInitialClusters();
    };

    //add the markers
    if(this.opt_markers && ( this.opt_markers.length || Object.keys(this.opt_markers).length )){
        this.addMarkers(this.opt_markers);
    }

    //get bounds of the map
    var mapSouthWest = this.map_.getBounds().getSouthWest(),
        mapNorthEast = this.map_.getBounds().getNorthEast(),
        mapBounds = new this.GM.LatLngBounds(mapSouthWest, mapNorthEast),
        bounds = this.getExtendedBounds(mapBounds);

    //works only with the bounds of the viewport
    for(var i = 0, marker; marker = this.markers_[i]; i++){
        if(!marker.isAdded && this.isMarkerInBounds_(marker, bounds)){
            this.addToClosestCluster_(marker);
        }
    }
};

/**
 * Returns the size of the grid.
 *
 * @return {number} The grid size.
 */
MarkerClusterer.prototype.getGridSize = function() {
  return this.gridSize_;
};

/**
 * Returns the min cluster size.
 *
 * @return {number} The grid size.
 */
MarkerClusterer.prototype.getMinClusterSize = function() {
  return this.settings.minClusterSize;
};

/**
 * Sets the min cluster size.
 *
 * @param {number} size The grid size.
 */
MarkerClusterer.prototype.setMinClusterSize = function(size) {
  this.settings.minClusterSize = size;
};

/**
 * Whether average center is set.
 *
 * @return {boolean} True if averageCenter_ is set.
 */
MarkerClusterer.prototype.isAverageCenter = function() {
  return this.settings.averageCenter;
};

/**
 *  Gets the styles.
 *
 *  @return {Object} The styles object.
 */
MarkerClusterer.prototype.getStyles = function() {
  return this.settings.styles_;
};

/**
 * Whether zoom on click is set.
 *
 * @return {boolean} True if zoomOnClick_ is set.
 */
MarkerClusterer.prototype.isZoomOnClick = function() {
  return this.settings.zoomOnClick;
};

/**
 *  Gets the max zoom for the clusterer.
 *
 *  @return {number} The max zoom level.
 */
MarkerClusterer.prototype.getMaxZoom = function() {
  return this.maxZoom_;
};

/**
* @param {google.maps.Map} map
* @param {google.maps.LatLng} latlng
* @param {int} z
* @return {google.maps.Point}
*/
var latlngToPoint = function(map, latlng, z){
	var normalizedPoint = map.getProjection().fromLatLngToPoint(latlng); // returns x,y normalized to 0~255
	var scale = Math.pow(2, z);
	var pixelCoordinate = new google.maps.Point(normalizedPoint.x * scale, normalizedPoint.y * scale);
	return pixelCoordinate;
};

/**
* @param {google.maps.Map} map
* @param {google.maps.Point} point
* @param {int} z
* @return {google.maps.LatLng}
*/
var pointToLatlng = function(map, point, z){
	var scale = Math.pow(2, z);
	var normalizedPoint = new google.maps.Point(point.x / scale, point.y / scale);
	var latlng = map.getProjection().fromPointToLatLng(normalizedPoint);
	return latlng;
};

//polyfill
Object.keys = Object.keys || function(o){
    var result = [];
    for(var name in  o){
        if(o.hasOwnProperty(name)){
            result.push(name);
        }
    }
    return result;
};
