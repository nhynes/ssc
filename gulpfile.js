var gulp = require('gulp'),
    jscs = require('gulp-jscs'),
    jshint = require('gulp-jshint'),
    qunit = require('gulp-qunit'),
    rename = require('gulp-rename'),
    stylish = require('jshint-stylish'),
    uglify = require('gulp-uglify');

gulp.task( 'default', [ 'style', 'test', 'watch' ] );

gulp.task( 'test', function() {
    gulp.src( 'test/test.html' )
        .pipe( qunit() );
});

gulp.task( 'style', function() {
    gulp.src('ssc.js')
        .pipe( jscs() )
        .pipe( jshint() )
        .pipe( jshint.reporter( stylish ) )
        .pipe( jshint.reporter('fail') );
});

gulp.task( 'build', [ 'style', 'test' ], function() {
    gulp.src('ssc.js')
        .pipe( uglify() )
        .pipe( rename({ suffix: '.min' }) )
        .pipe( gulp.dest('./lib/') );
});

gulp.task( 'watch', function() {
    gulp.watch( [ 'ssc.js', 'test/*.js' ], [ 'style', 'test' ]);
});
