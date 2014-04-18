function initialize() {

    var progress = document.getElementById('progress');
    var progressBar = document.getElementById('progress-bar');

    var center = new google.maps.LatLng(-37.82, 175.24);
    //var center = new google.maps.LatLng(0, 0);

    var map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 1,
                    center: center,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    maxZoom: 5
                });

    //for (var i = 0; i < addressPoints.length; i++) {
        //var data= addressPoints[i];
        //var latLng = new google.maps.LatLng(data[0],data[1]);
        //var marker = new markerOverlay({
            //position: latLng,
            //map: map
        //});
    //}
    var southWest = new google.maps.LatLng(40.744656,-74.005966); // Los Angeles, CA
    var northEast = new google.maps.LatLng(34.052234,-118.243685); // New York, NY
    var lngSpan = northEast.lng() - southWest.lng();
    var latSpan = northEast.lat() - southWest.lat();
    for(var i = 1; i < 1000; i++){
        // Determine a random location from the bounds set previously
        var randomLatlng = new google.maps.LatLng(
            southWest.lat() + latSpan * Math.random(),
            southWest.lng() + lngSpan * Math.random()
        );
        var sMarker = new markerOverlay({
            position:randomLatlng,
            map: map
        });
    }
    //Adding a simple marker
    //var sMarker = new markerOverlay({
        //position:center,
        //map: map
    //})
}
google.maps.event.addDomListener(window, 'load', initialize);
