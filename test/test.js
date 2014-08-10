QUnit.test( 'getting the matrix for an element', function( assert ) {
    var byCSS = ssc('#test'),
        byElem = ssc( document.getElementById('test') );

    assert.deepEqual( byCSS, byElem,
        'the matrices retrieved via CSS and elem should be the same');
    assert.ok( byCSS instanceof ssc.CSSMatrix, 'ssc() should return a CSSMatrix');
    assert.ok( byElem instanceof ssc.CSSMatrix, 'ssc() should return a CSSMatrix');

    assert.throws( function() {
        ssc(Error);
    }, Error, 'should have failed to grab matrix for invalid elem parameter' );

    assert.throws( function() {
        ssc('doesntexit');
    }, Error, 'should have failed to grab matrix for non-existent elem');
});

QUnit.test( 'getting the initial transformation parameters', function( assert ) {
    var matrix = ssc('#test');

    assert.strictEqual( matrix.getOriginCSS(), '50px 50px 0',
        'initial origin should be center' );
    assert.strictEqual( matrix.toTransformMatrix(),
        'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
        'initial transform should be the 3D identity' );
});

QUnit.test( 'getting the transformation parameters of a transformed element', function( assert ) {
    ssc('#test').apply();
    var newMatrix = ssc('#test');

    assert.strictEqual( newMatrix.toTransformMatrix(),
        'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
        'null transformation of identity should return identity matrix3d' );
});


QUnit.test( 'translations', function( assert ) {
    var matrix = ssc('#test'),
        translated = matrix.translate( 42, 69, 99 ),
        translatedVect = matrix.translate([ 42, 69, 99 ]),
        setTranslate;

    assert.strictEqual( translated.toTransformMatrix(),
         'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 42, 69, 99, 1)');

    assert.deepEqual( translated, translatedVect,
        'translate should produce the same result for both positional and vector arguments');

    setTranslate = matrix.setTranslate( 42 );
    assert.strictEqual( setTranslate.toTransformMatrix(),
         'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 42, 0, 0, 1)');

    assert.strictEqual( setTranslate.translate( 1, 1 ).toTransformMatrix(),
        'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 43, 1, 0, 1)',
        'translating with fewer than three arguments should leave the old translate intact');
});

QUnit.test( 'scales', function( assert ) {
    var matrix = ssc('#test'),
        scaled = matrix.scale( 42, 69, 99 ),
        scaledVect = matrix.scale([ 42, 69, 99 ]),
        setScale;

    assert.strictEqual( scaled.toTransformMatrix(),
         'matrix3d(42, 0, 0, 0, 0, 69, 0, 0, 0, 0, 99, 0, 0, 0, 0, 1)');

    assert.deepEqual( scaled, scaledVect,
        'scale should produce the same result for both positional and vector arguments');

    setScale = matrix.setScale( 42 );
    assert.strictEqual( setScale.toTransformMatrix(),
         'matrix3d(42, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');

    assert.strictEqual( setScale.scale( 2, 0 ).toTransformMatrix(),
        'matrix3d(84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
        'scaling with fewer than three arguments should leave the old scale intact');
});

QUnit.test( 'change transform', function( assert ) {
    var matrix = ssc('#test').scale( 0.5, 2 ).changeOrigin('top left'),
        originAbsolute,
        originPercent;

    assert.strictEqual( matrix.getOriginCSS(), '0px 0px 0' );

    assert.strictEqual( matrix.toTransformMatrix(),
        'matrix3d(0.5, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 25, -50, 0, 1)');

    originAbsolute = ssc('#test').changeOrigin( 10, 10 );
    originPercent = ssc('#test').changeOrigin('10% 10%');

    assert.strictEqual( originAbsolute.getOriginCSS(), '10px 10px 0' );
    assert.strictEqual( originAbsolute.getOriginCSS(), originPercent.getOriginCSS() );
});
