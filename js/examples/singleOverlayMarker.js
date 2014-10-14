var map = "map",
    objMap = document.getElementById(map),
    mapOpts = {
        zoom: 12,
        center: new google.maps.LatLng( addressPoints[0][0],addressPoints[0][1]),
        mapTypeId: google.maps.MapTypeId.TERRAIN
    };

var objGMap = new google.maps.Map(objMap, mapOpts);

    //markers = [];

//for(var index = 0; index < addressPoints.length; index++){
    //var point = addressPoints[index];
    //markers[index] = new SingleOverlayMarker({
        //map:objGMap,
        //position: new google.maps.LatLng(point[0], point[1])
    //});
//}
