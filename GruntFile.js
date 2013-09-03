module.exports = function(grunt) {
    var _ = require('blood')
      , srcDir = 'node_modules/'
      , tarDir = 'js/'
      , manifest = {
            'aok': 'aok',
            'blood': 'blood',
            'cargo': 'cargo',
            'cmon': 'cmon',
            'dj': 'dj',
            'dope': 'dope',
            'elo': 'elo',
            'ender-js': 'ender',
            'oi': 'oi',
            'response.js': 'response',
            'scan': 'scan',
            'underscore': 'underscore',
            'verge': 'verge',
            'vibe': 'vibe'      
        };
        
    function createFilesMap(suffix) {
        return _.inject(manifest, function(memo, base, name) {
            memo[tarDir + base + '/' + base + suffix] = [srcDir + name + '/' + base + '.js'];
            return memo;
        }, {});
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                banner: ''
            },
            build: {
                files: createFilesMap('.js')
            }
        },
        uglify: {
            options: {
                preserveComments: 'some',
            },
            build: {
                files: createFilesMap('.min.js')
            }
        }
    });
    
    // Load task plugins
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // 'default' is run by typing 'grunt' on the command line
    grunt.registerTask('default', ['concat', 'uglify']);
};