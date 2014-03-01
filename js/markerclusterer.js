function MarkerClusterer(map, opt_markers, opts){
    //CONSTANTS
    this.GM = google.maps;
    this.GE = this.GM.event;
    this.map_ = map;

    //extend to google.maps.OverlayView()
    this.extend(MarkerClusterer, this.GM.OverlayView);

    //defaults
    var defaults = {
        maxClusterRadio: 80,
        minClusterSize: 2,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        singleMarkerMode: false,
        disableClusteringAtZoom: null,

        // Setting this to false prevents the removal of any clusters outside of the viewpoint, which
        // is the default behaviour for performance reasons.
        removeOutsideVisibleBounds: true,
        //Whether to animate adding markers after adding the MarkerClusterGroup to the map
        // If you are adding individual markers set to true, if adding bulk markers leave false for massive performance gains.
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
        styles_: ''
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
    this.ready_ = false;

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

    //init the library
    this.initialize();
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
  this.setReady_(true);
};

/**
 * Implementaion of the interface method.
 * its REQUIRED when the Markerclusterer is extended of google.maps.Overlayview
 * @ignore
 */
MarkerClusterer.prototype.draw = function() {};

MarkerClusterer.prototype.bindEvents = function(){
    var that = this;

    //when change the zoom of map
    this.GE.addListener(this.map_, 'zoom_changed', function(){
        var zoom = that.map_.getZoom(),
            minZoom = that.map_.minZoom || 0,
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

    //and add the markers
    if(this.opt_markers && ( this.opt_markers || Object.keys(this.opt_markers).length )){
        this.addMarkers(this.opt_markers);
    }
};

MarkerClusterer.prototype.addMarkers = function(markers){
    var chunked = this.settings.chunkedLoading,
        chunkInterval = this.settings.chunkInterval,
        chunkProgress = this.settings.chunkProgress,
        marker = null,
        that = this;

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
                that.pushMarkerTo_(marker);
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
            this.pushMarkerTo_(markers[marker]);
        }
    }
};

MarkerClusterer.prototype.pushMarkerTo_ = function(marker){
    marker.isAdded = false;
    this.markers_.push(marker);
    this.createClusters_();
};

MarkerClusterer.prototype.addMarker = function(marker){
    this.pushMarkerTo_(marker);
};

/**
 * Sets the clusterer's ready state.
 *
 * @param {boolean} ready The state.
 * @private
 */
MarkerClusterer.prototype.setReady_ = function(ready) {
  if (!this.ready_) {
    this.ready_ = ready;
    this.createClusters_();
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
MarkerClusterer.prototype.addToClosestCluster_ = function(marker){
    var distance = 40000;
    var clusterAddTo = null;
    var pos = marker.getPosition();

    for(var i = 0, cluster; cluster = this.clusters_[i]; i++){
        var center = cluster.getCenter();
        if(center){
            var d = this.distanceBetweenPoints_(center, marker.getPosition());
            if(d < distance){
                distance = d;
                clusterAddTo = cluster;
            }
        }
    }

    if(clusterAddTo && clusterAddTo.isMarkerInClusterBounds(marker)){
        clusterAddTo.addMarker(marker);
    } else {
        var cluster = new Cluster(this);
        cluster.addMarker(marker);
        this.clusters_.push(cluster);
        console.log('this.clusters_', this.clusters_);
    }
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

MarkerClusterer.prototype.createClusters_ = function(){
    if(!this.ready_){
        return;
    }
    //get bounds of the map
    var mapSouthWest = this.map_.getBounds().getSouthWest(),
        mapNorthEast = this.map_.getBounds().getNorthEast(),
        mapBounds = new this.GM.LatLngBounds(mapSouthWest, mapNorthEast),
        bounds = this.getExtendedBounds(mapBounds);

    for(var i = 0, marker; marker = this.markers_[i]; i++){
        log('marker', marker);
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
}

/**
 *  Gets the max zoom for the clusterer.
 *
 *  @return {number} The max zoom level.
 */
MarkerClusterer.prototype.getMaxZoom = function() {
  return this.maxZoom_;
};;

MarkerClusterer.prototype.initialize = function(){
    this.bindEvents();
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
