function MarkerOverlap(cluster){
  cluster.getMarkerClusterer().extend(MarkerOverlap, google.maps.OverlayView);
  this.cluster_ = cluster;
  this.clusterIcon_ = this.cluster_.clusterIcon_;

  //config
  //this.configOverLap= {
    //_circleFootSeparation: 25,
    //_circleStartAngle: Math.PI / 6,
    //_spiralFootSeparation: 28,
    //_spiralLenghtStart: 11,
    //_spiralLengthFactor: 5,
    //_circleSpiralSwitchover: 9
  //};
  //CONSTANTS
  this.GM = google.maps;
  this.GE = this.GM.event;
  this.MT = this.GM.MapTypeId;
  this.PI2 = Math.PI * 2;
  this.listeners = {};
  //settings
  this.keepSpiderfied = false; //yes -> don't unspiderfy when a marker is selected
  this.markersWontHide = false; //yes -> a promise you won't hide markers, so we needn't check
  this.markersWontMove = false; //yes -> a promise you won't move markers, so we needn't check

  this.nearbyDistance = 20; //spiderfy markers within this range of the one clicked, in px
  this.circleSpiralSwitchover = 9; /*show spiral instead of circle from this marker count upwards
                                     0 -> always spiral; Infinity -> always circle
                                    */
  this.circleFootSeparation = 23; //related to circumference of circle
  this.circleStartAngle = this.PI2 / 12; //related to size of spiral (experiment!)
  this.spiralFootSeparation = 26;
  this.spiralLengthStart = 11;
  this.spiralLengthFactor = 4;

  this.spiderfiedZIndex = 1000;       // ensure spiderfied markers are on top
  this.usualLegZIndex = 10;           // for legs
  this.highlightedLegZIndex = 20;     // ensure highlighted leg is always on top

  this.legWeight = 1.5;
  this.legColors = {
      usual : {},
      highlighted: {}
  };

  legColorUsual = this.legColors.usual;
  legColorHigh = this.legColors.highlighted;
  legColorUsual[this.MT.HYBRID] = legColorUsual[this.MT.SATELLITE] = '#fff';
  legColorHigh[this.MT.HYBRID] = legColorHigh[this.MT.SATELLITE] = '#f00';
  legColorUsual[this.MT.HYBRID] = legColorUsual[this.MT.ROADMAP] = '#444';
  legColorHigh[this.MT.HYBRID] = legColorHigh[this.MT.ROADMAP] = '#f00';

  //process
  this.markerClusterer = this.cluster_.getMarkerClusterer();
  this.map = this.cluster_.map_;
  var that = this;
  var markers = this.cluster_.markers_,
      map = this.cluster_.map_,
      //factor = 0.00001, cuando tiene el máximo zoom = 21
      factor = 0,
      hideMarkersBeforeExpanded = function(){
          var expandedMarkers = this.markerClusterer.expandedMarkers_;
          if(expandedMarkers.length){
              for (var i = 0, marker; marker = expandedMarkers[i]; i++) {
                  if(marker.active){
                      marker.point.setMap(null);
                      delete marker;
                  }
              }
          }
      };
      var showMarkers = function(marker, destination){
        var point = new that.GM.Marker();
        var toLat = marker.position.lat() + factor;
        var toLng = marker.position.lng() + factor;
        var to = new that.GM.LatLng(toLat, toLng);
        point.setPosition(to);
        point.setMap(map);
        that.markerClusterer.expandedMarkers_.push({point: point, active: true});
        //la suma debe ser proporcional según el maxzoom dado
        //dándose los casos
        //maxzoom = 21 el factor sería que autosume a 0.00001
        //maxzoom = 18 el factor sería que autosume a 0.00011
        //factor+=0.00011;
      };

  //hideMarkersBeforeExpanded();
  //for (var i = 0, marker; marker = markers[i]; i++) {
      //marker.setPosition();
      //showMarkers(marker);
      //marker.setMap(this.map_);
  //};
  //make a cluster coord
  console.log('this', this);
  console.log('cluster center', this.cluster_.center_);
  this.spiderListener(this.cluster_);
  this.init();
};


MarkerOverlap.prototype.init = function(marker){
  var markers = this.cluster_.markers_;
  //hide the clusterIcon
  //this.clusterIcon_.hide();
};

MarkerOverlap.prototype.initMarkerArrays = function(marker){
    this.markerClusterer.expandedMarkers_ = [];
    this.markerListenerRefs = [];
};

MarkerOverlap.prototype.addMarker = function(marker){
    if(marker._oms != null){
        return this;
    }
    marker._oms = true;
    this.markerClusterer.expandedMarkers_.push(marker);
};
//listen to spiderfy
MarkerOverlap.prototype.spiderListener = function(cluster){
    var markerSpiderfied = cluster._omsData != null;
    if(!(markerSpiderfied && this.keepSpiderfied)){
        this.unspiderfy();
    }

    //don't spiderfy in Street View or GE Plugin!
    if(markerSpiderfied || this.map.getStreetView().getVisible() || this.map.getMapTypeId() === 'GoogleEarthAPI'){

    } else {
        var nearbyMarkerData = [];
        var nonNearbyMarkers = [];
        //reference to list of markers expendaded
        var markers = cluster.markers_;
        console.log('markers', markers);
        //declare a variable for transform the position of pixels
        var markerPt = null;
        for (var i = 0, marker; marker = markers[i]; i++) {
            //if(!(marker.map!=null) && marker.getVisible()){
                //continue;
            //}
            markerPt = this.llToPt(marker.position);
            //compare the principal marker with others and verify
            //append to nearbyMarkerData
            nearbyMarkerData.push({
                marker: marker,
                markerPoint: markerPt
            });
        }
        //prepare for create a shapes
        if(nearbyMarkerData.length === 1){

        } else {
            this.spiderfy(nearbyMarkerData);
        };
    }
    this.clusterIcon_.hide();
};

MarkerOverlap.prototype.unspiderfy = function(markerNotToMove){
    if(markerNotToMove == null){
        markerNotToMove = null;
    }
    if(this.spiderfied == null){
        return this;
    }
    this.unspiderfying = true;
    var unspiderfiedMarkers = [];
    var nonNearbyMarkers = [];
};

MarkerOverlap.prototype.spiderfy = function(markerData){
    var _this = this;
    this.spiderfying = true;
    console.log('spiderfy esto--->', markerData.length);
    var numMarkers = markerData.length,
        getBodyPt = function(){
            var result = [];
            for(var i = 0; i < markerData.length; i++){
                result.push(markerData[i].markerPoint);
            }
            return result;
        },
        collectionPointsNearby = getBodyPt(),
        footPts,
        footLl,
        nearestMarkerDatum,
        highlightListenerFuncs,
        marker;
        bodyPt = this.ptAverage(collectionPointsNearby);
        if(numMarkers >= this.circleSpiralSwitchover){
           footPts = this.generatePtsSpiral(numMarkers, bodyPt).reverse();
        } else {
           footPts = this.generatePtsCircle(numMarkers, bodyPt);
        }
    var getSpiderfiedMarkers = function(){
        var _results = [],
            footPt;
        for(var point = 0; point < footPts.length; point++){
            footPt = footPts[point];
            footLl = _this.ptToLl(footPt);
            nearestMarkerDatum = _this.minExtract(markerData, function(md){
                return _this.ptDistanceSq(md.markerPoint, footPt);
            });
            marker = nearestMarkerDatum.marker;
            leg = new _this.GM.Polyline({
                map: _this.map,
                path: [marker.position, footLl],
                strokeColor: _this.legColors.usual[_this.map.mapTypeId],
                strokeWeight: _this.legWeight,
                zIndex: _this.usualLegZIndex
            });
            marker._omsData = {
                usualPosition: marker.position,
                leg: leg
            };
        };
        if(_this.legColors.highlighted[_this.map.mapTypeId] !== _this.legColors.usual[_this.map.mapTypeId]){
            highlightListenerFuncs  = _this.makeHighlightListenerFuncs(marker);
            marker._omsData.highlightListeners = {
                highlight: _this.GE.addListener(marker, 'mouseover', highlightListenerFuncs.highlight),
                highlight: _this.GE.addListener(marker, 'mouseout', highlightListenerFuncs.unhighlight)
            };
        }
        console.log('footLl', footLl);
        marker.setPosition(footLl);
        marker.setZIndex(Math.round(this.spiderfiedZIndex + footPt.y));
        _results.push(marker);
        return _results;
    };
    spiderfiedMarkers = getSpiderfiedMarkers();
    delete this.spiderfying;
    this.spiderfied = true;
    return this.trigger('spiderfy', spiderfiedMarkers);
};

MarkerOverlap.prototype.generatePtsCircle = function(count, centerPt){
    var circumference = this.circleFootSeparation * (2 + count),
        legLength = circumference / this.PI2,
        angleStep = this.PI2 / count,
        pt = null,
        _results = [];
      for(var i = 0; i < count; i++){
        angle = this.circleStartAngle + i * angleStep;
        pt = new this.GM.Point(centerPt.x + legLength * Math.cos(angle),
                               centerPt.y + legLength * Math.sin(angle))
        _results.push(pt);
      }
      return _results;
};

MarkerOverlap.prototype.generatePtsSpiral = function(count,centerPt){
      var legLength = this.spiralLengthStart,
          twoPi = this.PI2,
          angle = 0,
          pt,
          _results = [];
      for(var i = 0; i < count; i++){
          angle += this.spiralFootSeparation / legLength + i * 0.0005;
          pt = new this.GM.Point(centerPt.x + legLength * Math.cos(angle),
                                 centerPt.y + legLength * Math.sin(angle))
          legLength += twoPi * this.spiralLengthFactor / angle;
          _results.push(pt);
      }
      return _results;
};


MarkerOverlap.prototype.llToPt =function(ll) {
    return this.clusterIcon_.getProjection().fromLatLngToDivPixel(ll);
};

MarkerOverlap.prototype.ptToLl =function(pt) {
    return this.clusterIcon_.getProjection().fromDivPixelToLatLng(pt);
};

MarkerOverlap.prototype.makeHighlightListenerFuncs =function(marker) {
    var _this = this;
    return {
        highlight: function(){
            return marker._omsData.leg.setOptions({
                strokeColor: _this.legColors.highlighted[_this.map.mapTypeId],
                zIndex: _this.highlightedLegZIndex
            });
        },
        unhighlight: function(){
            return marker._omsData.leg.setOptions({
                strokeColor: _this.legColors.usual[_this.map.mapTypeId],
                zIndex: _this.usualLegZIndex
            });
        }
    };
};

MarkerOverlap.prototype.minExtract =function(set, fn) {
    var bestIndex,
        bestVal,
        item,
        val;
    for(var i= 0; i< set.length; i++){
       item = set[i];
       val = fn(item);
       if(( typeof bestIndex === "undefined" || bestIndex === null ) || val < bestVal){
           bestVal = val;
           bestIndex = i;
       }
    };
    return set.splice(bestIndex, 1)[0];
};

MarkerOverlap.prototype.arrIndexOf =function(arr, obj) {
    var o;
    if(arr.indexOf != null){
        return arr.indexOf(obj);
    }
    for(var i = 0; i < arr.length; i++){
        o = arr[i];
        if( o === obj){
            return i;
        }
    }
    return -1;
}
MarkerOverlap.prototype.ptDistanceSq = function(pt1, pt2){
    var distanceX, distanceY;
    distanceX = pt1.x - pt2.x;
    distanceY = pt1.y - pt2.y;
    return distanceX * distanceX + distanceY * distanceY;
};
MarkerOverlap.prototype.ptAverage = function(pts){
    var sumX = 0,
        sumY = 0,
        numPts = pts.length;
    for (var i = 0; i < pts.length; i++){
        var pt = pts[i];
        sumX += pt.x;
        sumY += pt.y;
    }
    return new this.GM.Point(sumX / numPts, sumY / numPts);
};
MarkerOverlap.prototype.trigger = function(){
    var event = arguments[0],
        __slice = [].slice,
        args = 2 <= arguments.length? __slice.call(arguments, 1) : [],
        _ref3 = (_ref2 = this.listeners[event]) != null ? _ref2 : [],
        _result = [],
        fn;
    for(var i = 0; i < _ref3.length; i++){
        fn = _ref3[i];
        _result.push(fn.apply(null, args));
    }
    return _result;
}
