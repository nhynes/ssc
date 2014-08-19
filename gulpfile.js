var gulp = require('gulp'),
    jscs = require('gulp-jscs'),
    jshint = require('gulp-jshint'),
    plumber = require('gulp-plumber'),
    qunit = require('gulp-qunit'),
    rename = require('gulp-rename'),
    stylish = require('jshint-stylish'),
    uglify = require('gulp-uglify');

var path = {
    js: [ 'test/**/*.js', 'lib/ssc.js' ],
    tests: 'test/**/*',
    src: 'lib/ssc.js',
    lib: 'lib/'
}

gulp.task( 'default', [ 'checkstyle', 'test', 'watch' ] );

gulp.task( 'test', function() {
    gulp.src( 'test/test.html' )
        .pipe( qunit() );
});

gulp.task( 'checkstyle', function() {
    gulp.src([ 'lib/ssc.js', 'test/**/*.js' ])
        .pipe( plumber())
        .pipe( jscs() )
        .pipe( jshint() )
        .pipe( jshint.reporter( stylish ) );
});

gulp.task( 'dist', [ 'checkstyle', 'test' ], function() {
    gulp.src( path.src )
        .pipe( uglify() )
        .pipe( rename({ suffix: '.min' }) )
        .pipe( gulp.dest( path.lib ) );
});

gulp.task( 'watch', function() {
    gulp.watch( [ path.js ], [ 'checkstyle' ]);
    gulp.watch( [ path.src, path.tests], [ 'test' ]);
});
