var gulp = require('gulp'),
    jscs = require('gulp-jscs'),
    jshint = require('gulp-jshint'),
    qunit = require('gulp-qunit'),
    rename = require('gulp-rename'),
    stylish = require('jshint-stylish'),
    uglify = require('gulp-uglify');

var path = {
    js: [ 'test/**/*.js', 'lib/ssc.js' ],
    tests: 'test/**/*',
    src: 'lib/ssc.js'
}

gulp.task( 'default', [ 'checkstyle', 'test', 'watch' ] );

gulp.task( 'test', function() {
    gulp.src( 'test/test.html' )
        .pipe( qunit() );
});

gulp.task( 'checkstyle', function() {
    gulp.src([ 'lib/ssc.js', 'test/**/*.js' ])
        .pipe( jscs() )
        .pipe( jshint() )
        .pipe( jshint.reporter( stylish ) )
        .pipe( jshint.reporter('fail') );
});

gulp.task( 'dist', [ 'checkstyle', 'test' ], function() {
    gulp.src('ssc.js')
        .pipe( uglify() )
        .pipe( rename({ suffix: '.min' }) )
        .pipe( gulp.dest('lib/') );
});

gulp.task( 'watch', function() {
    gulp.watch( [ path.js ], [ 'checkstyle' ]);
    gulp.watch( [ path.src, path.tests], [ 'test' ]);
});
