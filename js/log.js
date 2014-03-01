/* Log */
window.log = (typeof (log) != "undefined") ? log : function () {
    var a = function () {
        //return /(local\.|dev\.)/gi.test(document.domain)
        return true;
    };
    if (typeof (console) != "undefined" && a()) {
        if (typeof (console.log.apply) != "undefined") {
            console.log.apply(console, arguments)
        } else {
            console.log(Array.prototype.slice.call(arguments))
        }
    }
};
