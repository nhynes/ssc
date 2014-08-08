var gulp = require('gulp'),
    jscs = require('gulp-jscs'),
    jshint = require('gulp-jshint'),
    qunit = require('gulp-qunit'),
    stylish = require('jshint-stylish'),
    uglify = require('gulp-uglify');

gulp.task( 'default', [ 'style', 'test', 'watch' ] );

gulp.task( 'test', function() {
    gulp.src( 'test/test.html' )
        .pipe( qunit() );
});

gulp.task( 'style', function() {
    gulp.src('3ssc.js')
        .pipe( jscs() )
        .pipe( jshint() )
        .pipe( jshint.reporter( stylish ) )
        .pipe( jshint.reporter('fail') );
});

gulp.task( 'build', [ 'style', 'test' ], function() {
    gulp.src('3ssc.js')
        .pipe( uglify() )
        .pipe( gulp.dest('./dist/') );
});

gulp.task( 'watch', function() {
    gulp.watch( [ '3ssc.js', 'test/*.js' ], [ 'style', 'test' ]);
});
