module.exports = function(grunt) {
    var _ = require('blood')
      , pkg = grunt.file.readJSON('package.json')
      , srcDir = 'node_modules/'
      , tarDir = 'js/' 
      , manifest = _.keys(pkg.optionalDependencies)
      , destinations = _.assign(_.object(manifest, manifest), _.pick({
            'ender-js': 'ender',
            'response.js': 'response'      
        }, manifest));
    
    function createFilesMap(suffix) {
        return _.inject(destinations, function(memo, base, name) {
            memo[tarDir + base + '/' + base + suffix] = [srcDir + name + '/' + base + '.js'];
            return memo;
        }, {});
    }

    grunt.initConfig({
        pkg: pkg,
        concat: {
            options: { banner: '' },
            build: { files: createFilesMap('.js') }
        },
        uglify: {
            options: { preserveComments: 'some' },
            build: { files: createFilesMap('.min.js') }
        },
        jshint: {
            dir: ['*.js'], // current dir
            grunt: ['GruntFile.js'],
            options: {
                ignores: ['**/**/node_modules/', '**/**/vendor/', '**/**.min.js'], // in any dir
                expr:true, sub:true, supernew:true, debug:true, node:true, 
                boss:true, devel:true, evil:true, laxcomma:true, eqnull:true, 
                undef:true, unused:true, browser:true, jquery:true, maxerr:10
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // 'default' is run by typing 'grunt' on the command line
    grunt.registerTask('default', ['jshint:dir', 'concat', 'uglify']);
};