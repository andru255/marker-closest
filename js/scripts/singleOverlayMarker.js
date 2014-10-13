/*
 * Class only deal like a single Marker
 * */
var SingleOverlayMarker = function(options){

    var defaults = {
        position: null,
        icon: 'https://mts.googleapis.com/vt/icon/name=icons/spotlight/spotlight-poi.png&scale=1',
        map: null,
        height: 5,
        width: 5
    };

    if(!this.settings.map){
        return;
    }

    this.settings = UTILS.merge(defaults, options);
};
SingleOverlayMarker.prototype.dealMap = function(){

};
