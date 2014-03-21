function initialize() {

    var progress = document.getElementById('progress');
    var progressBar = document.getElementById('progress-bar');

    var center = new google.maps.LatLng(-37.82, 175.24);

    var map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 13,
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
        //marker.setMap(map);
        //oms.addMarker(marker);
    }

    var updateProgressBar = function(processed, total, elapsed){

        //console.log('processed', processed);
        //console.log('total', total);
        //console.log('elapsed', elapsed);

        if(elapsed > 1000) {
            progress.style.display = 'block';
            progressBar.style.width = Math.round(processed/total*100) + '%';
        }

        if(processed === total){
            //all markers is processed - hide the progressbar
            progress.style.display = 'none';
        }
    };

    var markerCluster = new MarkerClusterer(map, {
            //The grid size of a cluster in pixels. The grid is a square. The default value is 80.
            maxClusterRadio: 80,
            //The maximum zoom level at which clustering is enabled or null if clustering is to be enabled at all zoom levels. The default value is null.
            maxZoom: 18,
            chunkProgress:updateProgressBar
    });

    //using simple addLayer
    for(var m = 0; m < markers.length; m++){
        markerCluster.addMarker(markers[m]);
    };
    //using multiple addLayer
    //for()
    //cuando ejecute el ultimo zoom y existan markers muy cercanos unos a otros
   // google.maps.event.addListener(markerCluster,'clusterclickLastZoom', function(e){
    //    console.log('clusterclickLastZoom', e);
   // });
}
google.maps.event.addDomListener(window, 'load', initialize);
