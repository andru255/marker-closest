module.exports = function(grunt){
    var treeSrc = [

    ];
    grunt.initConfig({
        concat: {
            dist:{
                src:treeSrc,
                dest:'Markerclusterer.js'
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-concat');
};
