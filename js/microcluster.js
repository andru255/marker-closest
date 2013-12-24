
//console.log('MarkerClusterer', MarkerClusterer);
function MicroCluster(cluster){
/*  cluster.extend(MicroCluster, google.maps.OverlayView);*/
  ////settings from markerclusterer
  //this.cluster = cluster;
  //this.map = cluster.getMap();
  //this.maxZoom = cluster.getMaxZoom();
  ////instanciate a variable for the current context
  //_that = this;

  //console.log('cluster', cluster);

  ////setup events
  //google.maps.event.addDomListener(this.map, 'zoom_changed', function() {
    //var currentZoomLevel = _that.map.getZoom();
    //console.log('haciendo zoom', currentZoomLevel);
    //if(currentZoomLevel > _that.maxZoom){
        //_that.create();
    //}
  /*});*/
}
MicroCluster.prototype.create = function(){
    //console.log('create a micro!', this.cluster);
}
