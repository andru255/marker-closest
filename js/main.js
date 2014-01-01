function initialize() {
    var center = new google.maps.LatLng(-37.79, 175.27);

    var map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 3,
                    center: center,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    maxZoom: 18
                });

    //var oms = new OverlappingMarkerSpiderfier(map, {markersWontMove: true, markersWontHide: true});

    window.map = map;
    var markers = [];
    for (var i = 0; i < addressPoints.length; i++) {
        var data= addressPoints[i];
        var latLng = new google.maps.LatLng(data[0],data[1]);
        var marker = new google.maps.Marker({
            position: latLng
        });
        markers.push(marker);
        //oms.addMarker(marker);
    }
    var markerCluster = new MarkerClusterer(map, markers, {
            //The grid size of a cluster in pixels. The grid is a square. The default value is 60.
            gridSize: 90,
            //The maximum zoom level at which clustering is enabled or null if clustering is to be enabled at all zoom levels. The default value is null.
            maxZoom: 18
    });

    //cuando ejecute el ultimo zoom y existan markers muy cercanos unos a otros
   // google.maps.event.addListener(markerCluster,'clusterclickLastZoom', function(e){
    //    console.log('clusterclickLastZoom', e);
   // });
}
google.maps.event.addDomListener(window, 'load', initialize);
