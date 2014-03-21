function MarkerClusterer(map, opt_markers, opts){
    //CONSTANTS
    this.GM = google.maps;
    this.GE = this.GM.event;
    this._map = map;

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
        _styles: [],
        imagePath: 'http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/' +
                   'images/m',
        imageExtension: 'png'
    };

    /**
     * @type {Array.<google.maps.Marker>}
     * @private
     */
    this._markers = [];
    this._markersBeforeLoadOverlay = [];
    /**
     * @type {Array.<Cluster>}
     */
    this._clusters = [];

    this.sizes = [53, 56, 66, 78, 90];

    /**
     * @private
     */
    this._styles = [];
    this._needsClustering = [];
    this._needsRemoving = [];
    this._currentShownBounds = null;
    this._inZoomAnimation = 0;

    /**
     * featureoverlays
     * @private
     */
    this._featureGroup = new featureOverlay(this._map);
    this._nonPointGroup = new featureOverlay(this._map);

    /**
     * @type {boolean}
     * @private
     */
    this._load = false;

    /**
    * @type {boolean}
    * @private
    */
    this._averageCenter = false;

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
  this._onLoad(true, function(that){

      //Remember the current zoom level and bounds
      this._zoom = this._map.getZoom();
      //storage range of zoom
      that.minZoom = that._map.minZoom || 0;
      this.maxZoom = this._map.mapTypes[this._map.getMapTypeId()].maxZoom;

      that._generateInitialClusters();


      that._featureGroup.onAppendMarker(that._map);
      that._nonPointGroup.onAppendMarker(that._map);

      that._currentShownBounds = that._getExpandedVisibleBounds();
      that._dispatchMarkers();
  });
};

/**
 * Sets up the styles object.
 *
 * @private
 */
MarkerClusterer.prototype.setupStyles = function() {
  var that = this.settings;
  if (that._styles.length) {
    return;
  }

  for (var i = 0, size; size = this.sizes[i]; i++) {
    that._styles.push({
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
    this.GE.addListener(this._map, 'zoom_changed', function(){

        //get the current zoom
        var zoom = that._map.getZoom(),
            //set the minZoom or 0 to minZoom variable
            minZoom = that.settings.minZoom || 0,
            //calculate the maxZoom
            maxZoom = Math.min(that._map.maxZoom || 100,
                               that._map.mapTypes[that._map.getMapTypeId()].maxZoom);

        zoom = Math.min(Math.max(zoom, minZoom), maxZoom);

        if(that._prevZoom != zoom) {
            that._prevzoom = zoom;
        }

        that.zoomChangedCluster && that.zoomChangedCluster.apply(this);
    });

    //when is idle
    this.GE.addListener(this._map, 'idle', function(){
        that.idleCluster && that.idleCluster.apply(this);
    });

};

MarkerClusterer.prototype.addMarkers = function(markerCollection){
    var fg = this._featureGroup,
        npg = this._nonPointGroup,
        chunked = this.settings.chunkedLoading,
        chunkInterval = this.settings.chunkInterval,
        chunkProgress = this.settings.chunkProgress,
        marker = null,
        that = this;

    if(markerCollection.length){
        var offset = 0,
            started = (new Date()).getTime();

        var process = function(){
            var start = (new Date()).getTime();

            for(;offset < markerCollection.length; offset++){
                if(chunked && offset % 200 === 0){
                    //every couple hundred markersCollection, instrument the time elapsed since processing started:
                    var elapsed = (new Date()).getTime() - start;
                    if(elapsed > chunkInterval){
                        break;
                    }
                }

                marker = markerCollection[offset];

                //append to Map
                marker.setMap(that._map);

                //verify if is Added
                if(marker.isAdded){
                    continue;
                }

                that._pushMarkerTo(marker, that.maxZoom);
                //if we just made a cluster of size 2 then we need to remove the other marker from the map (if it is) or we never will
                if(marker._parent){
                    if(marker._parent.getChildCount() === 2){
                        var markers = marker._parent.getAllChildMarkers(),
                        otherMarker = markers[0] === marker ? markers[1] : markers[0];
                        //that._remove(otherMarker);
                    }
                }
            }

            if(chunkProgress){
                //report the progress
                chunkProgress(offset, markerCollection.length, (new Date()).getTime() - started);
            }
            //render the markers when..
            if(offset === markerCollection.length){
                that._featureGroup.eachMarker(function(i, c){
                    if(c instanceof Cluster && c._iconNeedsUpdate){
                        //update icon!!
                    }
                });
                console.log('this._topClusterLevel', that._topClusterer);
                console.log('that._zoom', that._zoom);
                that._topClusterer._recursiveAppendChildToMap(null, that._zoom, that._currentShownBounds);
            } else {
                setTimeout(process, this.settings.chunkDelay);
            }
        };
        process();
    }
};

/**
 * Push the marker and behaviour with the map and clusters.
 *
 * @private
 */
MarkerClusterer.prototype._pushMarkerTo = function(marker, zoom){
    marker.isAdded = true;
    this._markers.push(marker);

    var gridClusters = this._gridClusters,
        gridUnclustered = this._gridUnClustered,
        markerPoint, z;

    //for each zoom
    for(;zoom >=0; zoom--){
        //make the position of the marker to pixels according the zoom
        markerPoint = latlngToPoint( this._map, marker.getPosition(), zoom);
        //try find a cluster closest
        var closest = gridClusters[zoom].getNearObject(markerPoint);

        if(closest){
            closest.addMarker(marker);
            marker._parent = closest;
            return;
        }

        //try find a markers closest for form a new cluster with these
        closest = gridUnclustered[zoom].getNearObject(markerPoint);
        if(closest){
            //reference a parent of my object closest found
            var parent = closest._parent;
            //if exists
            if(parent){
               //remove the parent of closest
               this._remove(closest, false);
            }

            //create new Cluster with these 2 in it
            var newCluster = new Cluster(this, zoom, closest, marker);
            gridClusters[zoom].addObject(newCluster,latlngToPoint(this._map, newCluster.getCenter(), zoom));
            closest._parent = newCluster;
            marker._parent = newCluster;

            //first we create a intermediate parent cluster
            var lastParent = newCluster;

            for(z = zoom -1; z > parent._zoom; z--){
                lastParent = new Cluster(this, z, lastParent);
                gridClusters[z].addObject(lastParent,latlngToPoint(this._map, closest.getPosition(), z));
            }
            parent.addMarker(lastParent);

            //Removes closest from this zoom level and any above that it is in, replace with newCluster
            for(z = zoom; z >=0; z--){
                if(!gridUnclustered[z].removeObj(closest, latlngToPoint(this._map, closest.getPosition(), z))){
                    break;
                }
            }
            return;
        }

        //Didn't manage to cluster in at this zoom, record us as a marker here
        gridUnclustered[zoom].addObject(marker, markerPoint);
    }
    this._topClusterer.addMarker(marker);
    marker._parent = this._topClusterer;
    return;
    //find the lowest zoom lovel to slot one in
    //this.createClusters_();
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
      this._addToClosestCluster(marker);
    }
  }
};

/**
 * Append a new single marker
 *
 * @private
 */
MarkerClusterer.prototype.addMarker = function(marker){
    console.log('add a Simple marker!');
    //verify if the overlayview its loaded
    //because the overlay projection's value it's necessary
    if(!this._load){
        this._markersBeforeLoadOverlay.push(marker);
    } else {
        //verify if its a collection of markers
        if(marker instanceof Cluster){
            var array = [];
            for(var i in marker._markers){
                array.push(marker._markers[i]);
            }
            return this.addMarkers(array);
        }
        //dont cluster if dont have data
        if(!marker.getPosition){
            this._nonPointGroup.appendMarker(marker);
            return this;
        }

        if(!this._map){
            this._needsClustering.push(marker);
            return this;
        }

        this._pushMarkerTo(marker, this._maxZoom);

        //Trabajando lo que es visible
        var visibleMarker = marker,
            currentZoom = this._map.getZoom();

        if(marker._parent){
            while(visibleMarker._parent._zoom >= currentZoom){
                visibleMarker = visibleMarker._parent;
            }
        }

        if(this._currentShownBounds.contains(visibleMarker.getPosition())){
            if(this.settings.animateAddingMarkers){
                this._animationAddMarker(marker, visibleMarker);
            } else {
                this._animationAddMarkerNotAnimated(marker, visibleMarker);
            }
        }
    }
    return this;
};

MarkerClusterer.prototype._generateInitialClusters = function(marker){
    log('generateInitialClusters!');
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
  if (!this._load) {
    this._load = state;
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

MarkerClusterer.prototype._addToClosestCluster = function(marker, zoom){
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
MarkerClusterer.prototype._getExpandedVisibleBounds = function(){
    if(!this.settings.removeOutsideVisibleBounds){
        return this._map.getBounds();
    }
    var map = this._map,
        bounds = map.getBounds(),
        sw = bounds.getSouthWest(),
        ne = bounds.getNorthEast(),
        latDiff = Math.abs(sw.lat() - ne.lat()),
        lngDiff = Math.abs(sw.lng() - ne.lng());


    return new this.GM.LatLngBounds(
        new this.GM.LatLng(sw.lat() - latDiff, sw.lng() - lngDiff),
        new this.GM.LatLng(ne.lat() + latDiff, ne.lng() + lngDiff)
    );
};
/*
 * It checks whether the placeholder viewport
 * */
MarkerClusterer.prototype._isMarkerInBounds = function(marker, bounds){
    return bounds.contains(marker.getPosition());
};

/*
 * Dispatch the markers in collection after and before the load of the overlay
 * */
MarkerClusterer.prototype._dispatchMarkers = function(){
    //if not ready
    if(!this._load){
        return;
    }

    //add the simple markers added when before loading of the overlay
    if(this._markersBeforeLoadOverlay.length){
        this.addMarkers(this._markersBeforeLoadOverlay);
    };

    //add the markers
    if(this.opt_markers && ( this.opt_markers.length || Object.keys(this.opt_markers).length )){
        this.addMarkers(this.opt_markers);
    };

    //get bounds of the map
    var mapSouthWest = this._map.getBounds().getSouthWest(),
        mapNorthEast = this._map.getBounds().getNorthEast(),
        mapBounds = new this.GM.LatLngBounds(mapSouthWest, mapNorthEast),
        bounds = this.getExtendedBounds(mapBounds);

    //works only with the bounds of the viewport
    //for(var i = 0, marker; marker = this.markers_[i]; i++){
        //if(!marker.isAdded && this._isMarkerInBounds(marker, bounds)){
            //this._addToClosestCluster(marker);
        //}
    //}
};

/**
 * Internal function for removing a marker from everything.
 * dontUpdateMap: set to true if you will handle updating the map manually (for bulk functions)
 * @private
 */
MarkerClusterer.prototype._remove = function(marker, removeFromDistanceGrid, dontUpdateMap) {
    var gridClusters = this._gridClusters,
        gridUnclustered = this._gridUnClustered,
        fg = this._featureGroup,
        map = this._map;

    //remove the marker from distance clusters it might be in
    if(removeFromDistanceGrid){
        for(var z = this.maxZoom_; z >= 0; z--){
            if(!gridUnclustered[z].removeObj(marker, pointToLatlng(this.map_, marker.getPosition(), z))){
                break;
            }
        }
    }

    //work our way up the clusters removing them as we go if required
    var cluster = marker._parent,
        markers = cluster._markers,
        otherMarker;

    //Remove the marker from the inmediate parents marker list
    this._arraySplice(markers, marker);

    while(cluster){
        cluster._childCount--;
        if(cluster._zoom < 0){
            //top level, do nothing
            break;
        }else if (removeFromDistanceGrid && cluster._childCount <= 1){ //Cluster no longer required
            //we need to push the other marker up to the parent
            otherMarker = cluster._markers[0] === marker ? cluster._markers[1] : cluster._markers[0];

            //Update distance grid
            gridClusters[cluster._zoom].removeObj(cluster, pointToLatlng(this.map_, cluster.getCenter(), cluster._zoom));
            gridUnclustered[cluster._zoom].addObject(otherMarker, pointToLatlng(this.map_, otherMarker.getPosition(), cluster._zoom));

            //Move otherMarker up to parent
            this._arraySplice(cluster._parent._childClusters, cluster);
            cluster._parent._markers.push(otherMarker);
            otherMarker._parent = cluster._parent;

            if(cluster._icon){
                //Cluster is currently on the map, need to put the marker on the map instead
                //fg.remove(cluster);
            }

        } else {

        }
        cluster = cluster._parent;
    }

    delete marker._parent;
};

/**
 * Remove the given object from the given array
 *
 * @private
 */
MarkerClusterer.prototype._arraySplice = function(someArray, obj){
    for(var i = someArray.length - 1; i >=0; i--){
        if(someArray[i] === obj){
            someArray.splice(i, 1);
            return true;
        }
    }
};
/**
 * Enqueue code to fire after the marker expand/contract has happened
 * @private
 */
MarkerClusterer.prototype._enqueue = function(fn){
    var that = this;
    this._queue.push(fn);
    if(!this._queueTimeout){
        this._queueTimeout = setTimeout(function(){
            that._processQueue.apply(that,that);
        }, 300);
    }
};

/**
 * Process the enqueue
 * @private
 */
MarkerClusterer.prototype._processQueue = function(){
    for(var i = 0; i < this._queue.length; i++){
        this._queue[i].call(this);
    }
    this._queue.length = 0;
    clearTimeout(this._queueTimeout);
    this._queueTimeout = null;
};

/**
 * Process the enqueue
 * @private
 */
MarkerClusterer.prototype.eachMarker = function(method, context){
    var markers = this._needsClustering.slice(),
        i;

    if(this._topClusterLevel){
       this._topClusterLevel.getAllChildMarkers(markers);
    }

    for( i = markers.length -1; i >=0; i++){
        method.call(context, markers[i]);
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
  return this.settings._styles;
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
 *  Gets the max zoom for the clusterer.
 *
 *  @return {number} The max zoom level.
 */
MarkerClusterer.prototype._animationAddMarkerNotAnimated = function(){

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
