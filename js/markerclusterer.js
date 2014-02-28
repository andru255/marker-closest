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
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        singleMarkerMode: false,
        disableClusteringAtZoom: null,

        //for performance
        removeOutsideVisibleBounds: true,
        //
        animateAddingMarkers: false,
        //
        spiderfyDistanceMultiplier: 1,
        //chunk
        chunkedLoading: false,
        chunkInterval:200,
        chunkDelay: 50,
        chunkProgress: null,
        //
        polygonOptions:{}
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

    //markers
    this.opt_markers = opt_markers;
    //override default properties
    this.settings = this.extend(defaults, opts);
    //init the library
    this.initialize();
};

/**
 * Extends a objects prototype by anothers.
 *
 * @param {Object} obj1 The object to be extended.
 * @param {Object} obj2 The object to extend with.
 * @return {Object} The new extended object.
 * @ignore
 */
MarkerClusterer.prototype.extend = function(obj1, obj2) {
  return (function(object) {
    for (var property in object) {
      this[property] = object[property];
    };
    for(var ProtoProperty in object.prototype){
      this.prototype[ProtoProperty] = object.prototype[property];
    };
    return this;
  }).apply(obj1, [obj2]);
};

/**
 * Implementaion of the interface method.
 * @ignore
 */
MarkerClusterer.prototype.onAdd = function() {
  console.log('ready!');
  this.setReady_(true);
};

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

    var tr = new this.GM.LatLng(bounds.getNorthEast().lat(),
        bounds.getNorthEast().lng());

    var b1 = new this.GM.LatLng(bounds.getSouthWest().lat(),
        bounds.getSouthWest().lng());

    var trPix = projection.fromLatLngToDivPixel(tr);
    trPix.x += this.settings.maxClusterRadio;
    trPix.y -= this.settings.maxClusterRadio;

    var blPix = projection.fromLatLngToDivPixel(bl);
    blPix.x -= this.settings.maxClusterRadio;
    blPix.y += this.settings.maxClusterRadio;

    var ne = projection.fromLatLngToDivPixel(trPix);
    var sw = projection.fromLatLngToDivPixel(blPix);

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
        bounds = new this.getExtendedBounds(mapBounds);

    for(var i = 0, marker; marker = this.markers_[i]; i++){
        if(!marker.isAdded && this.isMarkerInBounds_(marker, bounds)){
            console.log('marker', marker);
            this.addToClosestCluster_(marker);
        }
    }
};

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
