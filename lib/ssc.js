( function( factory ) {
    'use strict';
    if ( typeof define === 'function' && define.amd ) {
        define( [], factory );
    } else if ( typeof exports === 'object' ) {
        module.exports = factory();
    } else {
        window.ssc = factory();
    }
})( function() {
    'use strict';

    /* Maps Element -> {
     *     rotate: { axis: [ x, y, z ], angle: Number (radians) },
     *     scale: [ x, y, z ],
     *     skew: [ x, y ] // not currently implemented
     * }
     *
     * Precludes expensive, error prone, and possibly unhelpful decomposition (e.g. shear is lost)
     */
    var transformCache = {},
    sscid = 0,

    util = {
        getElem: function( elem ) {
            if ( !( elem instanceof Element ) ) {
                if ( typeof elem === 'string' ) {
                    elem = document.querySelector( elem );
                    if ( !elem ) {
                        throw ( Error('elem selector does not refer to a valid Element') );
                    }
                } else {
                    throw ( Error('elem must be either an Element or a CSS Selector') );
                }
            }
            return elem;
        },

        extend: function( obj, extension ) {
            var prop,
                extended = Object.create( obj );
            for ( prop in extension ) {
                if ( extension.hasOwnProperty( prop ) ) {
                    extended[ prop ] = extension[ prop ];
                }
            }
            return extended;
        },

        merge: function( base, extension ) {
            var prop,
                merged = this.cloneObject( base );
            for ( prop in extension ) {
                if ( extension.hasOwnProperty( prop ) ) {
                    merged[ prop ] = extension[ prop ];
                }
            }
            return merged;
        },

        truncate: function( number, decimalPlaces ) {
            var exp = Math.pow( 10, decimalPlaces );
            return Math.round( number * exp ) / exp;
        },

        padVector: function( array, length, padding ) {
            var i,
            paddedVector = [];

            length = length || 3;
            padding = ( padding !== undefined ? padding : 0 );
            for ( i = 0; i < length; i++ ) {
                paddedVector.push( ( (array[ i ] || array[ i ] === 0) ? array[ i ] : padding ) );
            }
            return paddedVector;
        },

        parseVectorArgs: function( args, padLen, padWith ) {
            // parses up to three arguments since there are only three dimensions
            args = Array.prototype.slice.call( args );
            var toParse = ( args[0] instanceof Array ? args[0] : args )
            .slice( 0, 3 );
            return util.padVector( toParse, padLen, padWith );
        },

        parseOriginArgs: function( args, elemDims ) {
            var origin = [];
            if ( typeof args[0] === 'string' ) {
                args[0].split( ' ' )
                .map( function( component, index, components ) {
                    var dimension;
                    if ( component.indexOf( '%' ) !== -1 ) {
                        dimension = ( index === 0 ?
                                     elemDims.width : elemDims.height );
                        origin[ index ] = dimension * parseFloat( component ) / 100;
                    } else {
                        switch ( component.toLowerCase() ) {
                            case 'left':
                                origin[0] = 0;
                                break;
                            case 'right':
                                origin[0] = elemDims.width;
                                break;
                            case 'top':
                                origin[1] = 0;
                                break;
                            case 'bottom':
                                origin[1] = elemDims.height;
                                break;
                            case 'center':
                                if ( components.length === 1 ) {
                                    origin = [ elemDims.width / 2, elemDims.height / 2 ];
                                } else {
                                    if ( index === 0 ) {
                                        origin[0] = elemDims.width / 2;
                                    } else {
                                        origin[1] = elemDims.height / 2;
                                    }
                                }
                                break;
                            default:
                                origin[2] = parseInt( component, 10 );
                        }
                    }
                });
            } else {
                origin = util.parseVectorArgs( args, 3, null );
            }
            origin[2] = origin[2] || 0;

            return origin;
        },

        zip: function() {
            var arrays = Array.prototype.slice.call( arguments ),
            minLenArray = arrays.reduce( function( minLen, array ) {
                return ( minLen.length < array.length ? minLen : array );
            });

            return minLenArray.map( function( _, index ) {
                return arrays.map( function( array ) {
                    return array[ index ];
                });
            });
        },

        normalizeVector: function( vector ) {
            var magnitude,
            normalized;

            magnitude  = Math.sqrt( vector.reduce( function( sum, elem ) {
                return sum + Math.pow( elem, 2 );
            }, 0 ) );
            normalized = vector.map( function( elem ) {
                return elem / magnitude;
            });

            return ( magnitude ? normalized : 0 );
        },

        hasRotate: function( matrix ) {
            matrix = matrix._matrix;
            var positiveDiag = [ matrix[0][0], matrix[1][1], matrix[2][2] ]
                .reduce( function( pos, elem ) {
                    return pos && elem >= 0;
                }, true );
            return !!( matrix[0][1] || matrix[1][2] || matrix[2][0] || !positiveDiag );
        },

        VENDORS: [ 'Moz', 'Webkit', 'ms', 'O' ],
        setPrefixedStyle: function( elem, propName, value ) {
            var capitalizedPropName = propName.charAt( 0 ).toUpperCase() + propName.slice( 1 );
            this.VENDORS.map( function( vendor ) {
                elem.style[ vendor + capitalizedPropName ] = value;
                elem.style.propName = value;
            });
        },

        getPrefixedStyle: function( elem, propName ) {
            var capitalizedPropName = propName.charAt( 0 ).toUpperCase() + propName.slice( 1 ),
                styles = window.getComputedStyle( elem );

            return styles[ propName ] || this.VENDORS.reduce( function( propVal, vendor ) {
                return styles[ vendor + capitalizedPropName ] || propVal;
            }, undefined );
        },

        cloneNumArray: function( matrixArray ) {
            return matrixArray.map( function( elem ) {
                if ( elem instanceof Array ) {
                    return util.cloneNumArray( elem );
                } else {
                    return elem;
                }
            });
        },

        numArraysEqual: function( A, B, tolerance ) {
            tolerance = tolerance || 0;
            var utils = this; // bind() doesn't work with tests, for some reason
            return A && B && A.length === B.length &&
                this.zip( A, B ).reduce( function( equal, elems ) {
                    var eq;
                    if ( elems[0] instanceof Array || elems[1] instanceof Array ) {
                        eq = elems[0].length === elems[1].length &&
                             utils.numArraysEqual.apply( utils, elems.concat( tolerance ) );
                    } else {
                        eq = Math.abs( elems[0] - elems[1] ) <= tolerance;
                    }
                    return equal && eq;
                }, true );
        },

        cloneObject: function( object ) {
            return JSON.parse( JSON.stringify( object ) ); // doesn't work on circular objects
        },

        cacheMod: function( initCache, invalid, change ) {
            var newCache = util.merge( initCache, change || {} );
            if ( invalid ) {
                invalid.map( function( entry ) {
                    newCache[ entry ] = null;
                });
            }
            return newCache;
        }
    };

    /**
     * Represents a real, nxm matrix
     * @constructor
     * @param {Array[n][m]|Matrix} matrix a Matrix or an nxm, row-major matrix array
     * or
     * @param {Number} n the number of rows of the unitary, diagonal matrix
     * @param {Number} m the number of columns of the unitary, diagonal matrix
     */
    function Matrix() {
        var n, m, row, initMatrix;
        if ( arguments[0] instanceof Matrix ) {
            initMatrix = arguments[0];
            this._matrix = initMatrix._matrix;
            this._cache = initMatrix._cache;
        } else if ( arguments[0] instanceof Array ) {
            this._matrix = util.cloneNumArray( arguments[0] );
            this._cache = arguments[1] || {}; // det, inv
        } else {
            this._matrix = [];
            for ( n = 0; n < arguments[0]; n++ ) {
                row = [];
                for ( m = 0; m < arguments[1]; m++ ) {
                    row.push( ( n === m ? 1 : 0 ) );
                }
                this._matrix.push( row );
            }
            this._cache = arguments[2] || {}; // det, inv
        }
        this.rows = this._matrix.length;
        this.cols = this._matrix[0].length;
    }

    Matrix.prototype = {
        /**
         * Returns a clone of this Matrix
         * @return {Matrix} a new copy of this Matrix
         */
        clone: function() {
            return new Matrix( util.cloneNumArray( this._matrix ), this._cache );
        },

        /**
         * Gets an element of this Matrix
         * @param {Number} i the element's row
         * @param {Number} j the element's column
         */
        get: function( i, j ) {
            return this._matrix[ i ][ j ];
        },

        /**
         * Sets an element of this Matrix
         * @param {Number} i the element's row
         * @param {Number} j the element's column
         * @param {Number} elem the element
         * @return {Matrix} a copy of this matrix with the replaced element
         */
        set: function( i, j, elem ) {
            var clonedMatrix = this.clone();
            clonedMatrix._cache = {};
            clonedMatrix._matrix[ i][ j ] = elem;
            return clonedMatrix;
        },

        /**
         * Compares two Matrices for equality.
         * @param {Matrix} other the Matrix to which this one is compared
         * @param {Number} tolerance a non-negative tolerance for equality. Default 0.
         * @return {Boolean} true iff the Matrices are equal
         */
        equals: function( other, tolerance ) {
            return other instanceof Matrix &&
                util.numArraysEqual( this._matrix, other._matrix, tolerance );
        },

        /**
         * Adds to Matrices
         * @param {Matrix} other the Matrix to be added
         * @return {Matrix} a new Matrix representing the result of the addition
         */
        add: function( other ) {
            return new Matrix( util.zip( this._matrix, other._matrix ).map( function( rows ) {
                return util.zip.apply( undefined, rows ).map( function( elems ) {
                    return elems[0] + elems[1];
                });
            }) );
        },

        /**
         * Subtracts two Matrices
         * @param {Matrix} other the Matrix to be subtracted
         * @return {Matrix} a new Matrix representing the result of the subtraction
         */
        subtract: function( other ) {
            return this.add( other.multiply( -1 ) );
        },

        /**
         * Multiplies the Matrix by another matrix.
         * @param {Matrix|Number} other the matrix or scalar by which to multiply
         * @return {Matrix} a new Matrix representing the result of the multiplication
         */
        multiply: function( other ) {
            if ( typeof other === 'number' ) {
                return new Matrix( this._matrix.map( function( row ) {
                    return row.map( function( elem ) {
                        return elem * other;
                    });
                }) );
            }

            var otherMatrixArrayT = util.zip.apply( undefined, other._matrix );

            if ( this.cols !== other.rows ) {
                throw Error( 'Can not multiply matrices of incompatible sizes: ' +
                             this.rows + 'x' + this.cols + ' * ' + other.rows + 'x' + other.cols );
            }

            return new Matrix( this._matrix.map( function( row ) {
                return otherMatrixArrayT.map( function( col ) {
                    return util.zip( row, col )
                        .map( function( components ) {
                            return components[0] * components[1];
                        })
                        .reduce( function( sum, val ) {
                            return sum + val;
                        }, 0 );
                });
            }) );
        },

        /**
         * Calculates the determinant of this Matrix.
         * @return {Number|NaN} the determinant or NaN if the matrix is not square
         */
        det: function() {
            if ( this._cache.det ) { return this._cache.det; }

            if ( this.rows !== this.cols ) { return NaN; }

            var matrix = this._matrix,
                det;

            if ( this.rows === 1 ) {
                return matrix[0][0];
            } else if ( this.rows === 2 ) {
                return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
            }

            det = matrix[0].reduce( function( det, elem, j ) {
                if ( elem === 0 ) { return det; }

                var sign = j % 2 * -2 + 1,
                    minor = new Matrix( matrix.slice( 1 ).map( function( row ) {
                        return row.filter( function( _, cj ) {
                            return cj !== j;
                        });
                    }) );

                return det + sign * elem * minor.det();
            }, 0 );

            this._cache.det = det;

            return det;
        },

        /**
         * Returns the transpose of this matrix
         * @return {Matrix} the tranpose of this matrix
         */
        transpose: function() {
            return new Matrix( util.zip.apply( undefined, this._matrix ) );
        },

        /**
         * Calculates the inverse of this Matrix
         * @return {Matrix} the inverse of this Matrix
         */
        inv: function() {
            if ( this._cache.inv ) { return this._cache.inv; }

            if ( this.rows !== this.cols ) { throw Error('Could not invert non-square matrix'); }

            var matrix = this._matrix,
                det = 0,
                inv,
                C;

            C = matrix.map( function( row, i ) {
                return row.map( function( elem, j ) {
                    var clonedMatrix = util.cloneNumArray( matrix ),
                        sign = ( i + j ) % 2 * -2 + 1,
                        minor,
                        cofactor;
                    clonedMatrix.splice( i, 1 );
                    minor = clonedMatrix.map( function( mRow ) {
                        mRow.splice( j, 1 );
                        return mRow;
                    });
                    cofactor = sign * new Matrix( minor ).det();
                    if ( i === 0 ) {
                        det += elem * cofactor;
                    }
                    return cofactor;
                });
            });

            inv = new Matrix( C ).transpose().multiply( 1 / det );

            this._cache.det = det;
            this._cache.inv = inv;

            return inv;
        },

        /**
         * Extracts a submatrix
         * @param {Array} rowRange [ start: Number, end: Number ] inclusive
         * @param {Array} colRange [ start: Number, end: Number ] inclusive
         * If end is not specified, it is assumed to be the end of the matrix
         *
         * @return {Matrix} the extracted submatrix
         */
        submatrix: function( rowRange, colRange ) {
            return new Matrix( this._matrix.slice( rowRange[0], ( rowRange[1] + 1 ) || undefined )
                .map( function( row ) {
                    return row.slice( colRange[0], ( colRange[1] + 1 ) || undefined );
                }) );
        }
    };

    /**
     * Creates a representation of a matrix3d in row-major order
     * @constructor
     * @extends Matrix
     * @param {Array[Array]|Matrix} matrix a 4x4 RP^3 transformation Matrix or matrix array
     * @param {Array} origin the transformation origin [ x, y, z ] in pixels
     * @param {Element} elem the element that will receive this transform
     * @param {Object} cacheHint suggest initial transform params. @see transformCache
     */
    function CSSMatrix( matrix, origin, elem, cacheHint ) {
        Matrix.call( this, matrix );
        this._origin = origin;
        this._elem = elem;
        var elemsscid = elem.getAttribute('data-sscid');
        this._cache = util.cacheMod( transformCache[ elemsscid ] || {}, null, cacheHint );
        // in addition to transformCache, this._cache may contain polarDecomp, det, and inv
    }

    CSSMatrix.prototype = util.extend( Matrix.prototype, {
        /**
         * Returns a copy of this CSS matrix
         * @return {CSSMatrix} a copy of the this CSSMatrix
         */
        clone: function() {
            var clonedMatrix = util.cloneNumArray( this._matrix );
            return new CSSMatrix( clonedMatrix, this._origin, this._elem, this._cache );
        },

        /**
         * Multiplies the Matrix by another matrix.
         * @param {CSSMatrix} other the matrix by which to multiply
         * @return {CSSMatrix} a new Matrix representing the result of the multiplication
         */
        multiply: function( other ) {
            var multiplied = Matrix.prototype.multiply.call( this, other );
            return new CSSMatrix( multiplied._matrix, this._origin, this._elem );
        },

        /**
         * Returns a copy of this matrix translated by <dx, dy, dz>
         *
         * Unspecified arguments default to zero.
         * @param {Array} translateVector the amount by which to translate [ x, y, z ] in pixels
         * or
         * @param {Number} dx the x amount by which to translate
         * @param {Number} dy the y amount by which to translate
         * @param {Number} dz the z amount by which to translate
         *
         * @return {CSSMatrix} a translated CSSMatrix
         */
        translate: function() {
            var translateBy = util.parseVectorArgs( arguments ),
                currentTranslate = this.getTranslate();

            return this.setTranslate( util.zip( currentTranslate, translateBy )
                .map( function( vects ) {
                    return ( vects[1] !== undefined ? vects[0] + vects[1] : 0 );
                }) );
        },

        /**
         * Returns a copy of this matrix translated to <x, y, z>
         *
         * Unspecified arguments default to zero.
         * @param {Array} translateVector the new translate vector [ x, y, z ] in pixels
         * or
         * @param {Number} x the new x translate
         * @param {Number} y the new y translate
         * @param {Number} z the new z translate
         *
         * @return {CSSMatrix} a translated CSSMatrix
         */
        setTranslate: function() {
            var translateVector = util.parseVectorArgs( arguments ),
                translatedMatrixArray = util.cloneNumArray( this._matrix ),
                newCache = util.cacheMod( this._cache, [ 'det', 'inv' ] );

            translateVector.map( function( elem, index ) {
                translatedMatrixArray[ index ][3] = elem;
            });

            return new CSSMatrix( translatedMatrixArray, this._origin, this._elem, newCache );
        },

        /**
         * Returns the current translation represented by this matrix
         * @return {Array} the current translation [ x, y, z ] in pixels
         */
        getTranslate: function() {
            return [ this._matrix[0][3], this._matrix[1][3], this._matrix[2][3] ];
        },

        /**
         * Returns a copy of this matrix scaled by dx, dy, dz. Does not translate.
         *
         * Unspecified arguments default to 1
         * @param {Array} newScale the new scale [ x, y, z ]
         * or
         * @param {Number} scaleByX the amount by which to scale x
         * @param {Number} scaleByY the amount by which to scale y
         * @param {Number} scaleByZ the amount by which to scale z
         *
         * @return {CSSMatrix} a scaled CSSMatrix
         */
        scale: function() {
            var scaleBy = util.parseVectorArgs( arguments, 4, 1 ),
                newScaleMatrixArray = util.zip( scaleBy, this._matrix ).map( function( elems ) {
                    return elems[1].map( function( entry ) {
                        return entry * elems[0];
                    });
                }),
                currentScale = this.getScale(),
                newCache = util.cacheMod( this._cache, [ 'det', 'inv', 'polarDecomp' ], {
                    scale: util.zip( currentScale, scaleBy ).map( function( scales ) {
                        return scales[0] * scales[1];
                    })
                });

            return new CSSMatrix( newScaleMatrixArray, this._origin, this._elem, newCache );
        },

        /**
         * Returns a copy of this matrix scaled to x, y, z. Does not translate.
         *
         * Unspecified arguments default to 1
         * @param {Array} newScale the new scale [ x, y, z ]
         * or
         * @param {Number} scaleX the new x scale
         * @param {Number} scaleY the new y scale
         * @param {Number} scaleZ the new z scale
         *
         * @return {CSSMatrix} a CSSMatrix with the new scale
         */
        setScale: function() {
            var scaleVector = util.parseVectorArgs( arguments, 3, 1 ),
                rotationMatrix = this.polarDecompose().u,
                newCache = util.cacheMod( this._cache, [ 'det', 'inv', 'polarDecomp' ], {
                    scale: scaleVector
                }),
                scaleMatrix = new Matrix([
                    [ scaleVector[0], 0, 0, 0 ],
                    [ 0, scaleVector[1], 0, 0 ],
                    [ 0, 0, scaleVector[2], 0 ],
                    [ 0, 0, 0, 1 ]
                ]),
                scaledMatrix = rotationMatrix.multiply( scaleMatrix );

            return new CSSMatrix( scaledMatrix, this._origin, this._elem, newCache );
        },

        /**
         * Returns the current [real, unrotated] scale represented by this matrix
         * @return {Array} The current scale [ x, y, z ]
         */
        getScale: function() {
            var extractScale = function( matrix ) {
                    return [ matrix._matrix[0][0], matrix._matrix[1][1], matrix._matrix[2][2] ];
                };

            return this._cache.scale ||
                extractScale( util.hasRotate( this ) ? this.polarDecompose().p : this );
        },

        /**
         * Performs a rotation about the specified axis. Does not rescale.
         * @param {Array} axis the vector about which to rotate [ x, y, z ]. Defaults to 0 vector.
         * @param {Number} angle the angle of rotation, in radians (CSS uses the *left-hand* rule)
         * @return {CSSMatrix} the rotated CSSMatrix
         */
        rotate: function( axis, angle ) {
            var unitAxis = util.normalizeVector( axis ),
                x = -unitAxis[0] || 0, x2 = Math.pow( x, 2 ),
                y = -unitAxis[1] || 0, y2 = Math.pow( y, 2 ),
                z = -unitAxis[2] || 0, z2 = Math.pow( z, 2 ),
                pcos = 1 - Math.cos( angle ),
                sin = Math.sin( angle ),
                rotationMatrix = [ // @see developer.mozilla.org/CSS/transform-function#rotate3d()
                    [ 1 + pcos * ( x2 - 1 ), z * sin + x * y * pcos, -y * sin + x * z * pcos, 0 ],
                    [ -z * sin + x * y * pcos, 1 + pcos * ( y2 - 1 ), x * sin + y * z * pcos, 0 ],
                    [ y * sin + x * z * pcos, -x * sin + y * z * pcos, 1 + pcos * ( z2 - 1 ), 0 ],
                    [ 0, 0, 0, 1 ]
                ],
                rotated = this.multiply( new Matrix( rotationMatrix ) );

            rotated._cache = util.cacheMod( this._cache, [ 'det', 'inv', 'polarDecomp' ] );

            return ( unitAxis ? rotated : this );
        },

        /**
         * Returns the axis and angle of rotation
         * @return {Object} { axis: Array, angle: Number }
         *  axis: the current axis of rotation
         *  angle: the current angle of rotation about the axis in radians [0, 2pi] (clockwise)
         */
        getRotate: function() {
            var R = this.polarDecompose().u._matrix,
                tr = R[0][0] + R[1][1] + R[2][2],
                acos = Math.acos( ( tr - 1 ) / 2 ),
                pcos = -tr / 2 + 1.5,
                axis = [
                    Math.sqrt( ( R[0][0] - 1 ) / pcos + 1 ) || 0,
                    Math.sqrt( ( R[1][1] - 1 ) / pcos + 1 ) || 0,
                    Math.sqrt( ( R[2][2] - 1 ) / pcos + 1 ) || 0
                ],
                asinX = Math.asin( ( R[1][2] - axis[1] * axis[2] * pcos ) / axis[0] ),
                asinY = Math.asin( ( R[2][0] - axis[0] * axis[2] * pcos ) / axis[1] ),
                asinZ = Math.asin( ( R[0][1] - axis[0] * axis[1] * pcos ) / axis[2] ),
                asin = -( asinX || asinY || asinZ || 0 ),
                angle = ( asin > 0 ? acos : ( 2 * Math.PI + asin ) % ( 2 * Math.PI ));

            return { axis: axis, angle: angle };
        },

        /**
         * Returns a new matrix with the specified rotation
         * @param {Array} axis the vector about which to rotate [ x, y, z ]. Defaults to 0 vector.
         * @param {Number} angle the angle of rotation, in radians (CSS uses the *left-hand* rule)
         * @return {CSSMatrix} the rotated CSSMatrix
         */
        setRotate: function( axis, angle ) {
            var currentTranslate = this.getTranslate(),
                currentScale = this.getScale(),
                id4 = new Matrix( 4, 4 )._matrix,
                rotatedMatrix = new CSSMatrix( id4, this._origin, this._elem )
                   .setScale( currentScale )
                   .setTranslate( currentTranslate )
                   .rotate( axis, angle );

            return rotatedMatrix;
        },

        /**
         * Performs a polar decomposition of the Matrix.
         * Polar decomposition does not preserve shear.
         * @return {Object} { u: Matrix, p: Matrix }
         *  u: A unitary rotation Matrix
         *  p: A stretching Matrix
         */
        polarDecompose: function() {
            if ( this._cache.polarDecomp ) { return this._cache.polarDecomp; }

            var Q0,
                Q1 = this.submatrix( [ 0, 2 ], [ 0, 2 ] ),
                tmpQ,
                lastInv = Q0,
                det,
                decomp,
                three2four = function( matrix ) {
                    var matrixArray = matrix._matrix.map( function( row ) {
                        return row.concat( 0 );
                    });
                    matrixArray.push([ 0, 0, 0, 1 ]);
                    return new Matrix( matrixArray );
                },
                scaleMatrix;

            if ( !util.hasRotate( this ) ) {
                return {
                    u: new Matrix( 4, 4 ),
                    p: this
                };
            } else if ( this._cache.scale ) {
                scaleMatrix = this.reset()
                    .scale( this._cache.scale ).submatrix( [ 0, 2 ], [ 0, 2 ] );
                return {
                    u: three2four( Q1.multiply( scaleMatrix.inv() ) ),
                    p: three2four( scaleMatrix )
                };
            }

            while ( !Q1.equals( Q0, 1e-10 ) ) {
                tmpQ = Q1;
                lastInv = Q1.inv(); // save this for determining P
                Q1 = Q1.add( lastInv.transpose() ).multiply( 0.5 );
                Q0 = tmpQ;
            }

            det = this.det(); // cached from computation of inverse

            decomp = {
                u: three2four( Q0 ),
                p: three2four( lastInv.multiply( this.submatrix( [ 0, 2 ], [ 0, 2 ] ) ) )
            };

            this._cache.polarDecomp = decomp;

            return decomp;
        },

        /**
         * Changes the transform origin while maintaining the current onscreen position
         *
         * Coordinates are relative to the top left edge of the element's *layout* bounding box
         * Unspecified arguments default to the previous value.
         * @param {Array} newOrigin the vector to the new origin
         * or
         * @param {Number} x the x coordinate of the new origin
         * @param {Number} y the y coordinate of the new origin
         * @param {Number} z the z coordinate of the new origin
         *
         * @return {CSSMatrix} a CSSMatrix with the new transform origin
         */
        changeOrigin: function() {
            var elemDims = {
                    width: parseFloat( window.getComputedStyle( this._elem ).width ),
                    height: parseFloat( window.getComputedStyle( this._elem ).height )
                },
                newOrigin = util.parseOriginArgs( arguments, elemDims ),
                dOrigin = util.zip( this._origin, newOrigin ).map( function( comps ) {
                    return ( comps[1] !== null ? comps[1] - comps[0] : 0 );
                }),
                currentScale = this.getScale(),
                currentRotate = this.polarDecompose().u,
                dOriginScaled = util.zip( dOrigin, currentScale ).map( function( comps ) {
                    return comps[0] * comps[1];
                }),
                dOriginT = new Matrix([ dOriginScaled.concat(0) ]).transpose().multiply( -1 ),
                dOriginRotated = currentRotate.multiply( dOriginT ).transpose()._matrix[0],
                delta = util.zip( dOrigin, dOriginRotated ).map( function( deltas ) {
                    return -(deltas[0] + deltas[1]);
                });

            this._origin = util.zip( this._origin, newOrigin ).map( function( comps ) {
                return ( comps[1] !== null ? comps[1] : comps[0] );
            });

            return this.translate( delta );
        },

        /**
         * Changes the transform origin.
         *
         * Coordinates are relative to the top left edge of the element's bounding box
         * Unspecified arguments default to the previous value.
         * @param {Array} newOrigin the vector to the new origin
         * or
         * @param {Number} x the x coordinate of the new origin
         * @param {Number} y the y coordinate of the new origin
         * @param {Number} z the z coordinate of the new origin
         *
         * @return {CSSMatrix} a CSSMatrix with the new transform origin
         */
        setOrigin: function() {
            var elemDims = {
                width: parseFloat( window.getComputedStyle( this._elem ).width ),
                height: parseFloat( window.getComputedStyle( this._elem ).height )
            },
            newOrigin = util.parseOriginArgs( arguments, elemDims );
            return new CSSMatrix( this._matrix, newOrigin, this._elem );
        },

        /**
         * Returns an array vector representing the origin of this transformation
         * @return {Array} the current origin [ x, y, z ] in pixels
         */
        getOrigin: function() {
            return util.cloneNumArray( this._origin );
        },

        /**
         * Returns a matrix3d representing the CSS transform
         * @return {matrix3d} the transform represented by this CSSMatrix in CSS form
         */
        toTransformMatrix: function() {
            var values = util.zip.apply( this, this._matrix )
                .map( function( col ) {
                    return col.map( function( elem ) {
                        return util.truncate( elem, 6 );
                    }).join( ', ' );
                }).join( ', ' );
            return 'matrix3d(' + values + ')';
        },

        /**
         * Returns the CSS transform origin associated with this matrix
         * @return {Array} the current transform origin [ x, y, z ] in pixels
         */
        getOriginCSS: function() {
            return this._origin[0] + 'px ' + this._origin[1] + 'px ' + this._origin[2];
        },

        /**
         * Applies the transformation represented by this CSSMatrix to the specified element
         * @param {Selector|Element} elem the element to which to apply the transform.
         *  Default: the originally selected element.
         * @return {CSSMatrix} the CSSMatrix of the applied transform
         */
        apply: function( elem ) {
            elem = ( elem ? util.getElem( elem ) : this._elem );

            util.setPrefixedStyle( elem, 'transform', this.toTransformMatrix() );
            util.setPrefixedStyle( elem, 'transformOrigin', this.getOriginCSS() );

            var elemsscid = elem.getAttribute('data-sscid');
            if ( !elemsscid ) {
                elemsscid = sscid;
                elem.setAttribute( 'data-sscid', sscid );
                sscid += 1;
            }

            transformCache[ elemsscid ] = this._cache;

            return this;
        },

        /**
         * Resets all transformations applied to this matrix
         * @return {CSSMatrix} a reset (identity) matrix
         */
        reset: function() {
            return new CSSMatrix( new Matrix( 4, 4 ), this._origin, this._elem, {
                det: 1,
                inv: 1,
                scale: [ 1, 1, 1 ],
                polarDecomp: undefined
            });
        }
    });

    /**
     * Parses the current transform of an element into a CSSMatrix
     * @param {Selector|Element} elem the element from which to grab the transform
     * @param {Object} cacheHint suggest the initial transform of the elem. @see transformCache
     * @return {CSSMatrix} a CSSMatrix representing the element's transform
     */
    function parseMatrix( elem, cacheHint ) {
        elem = util.getElem( elem );

        var cssMatrix,
            matrix = [
                [ 1, 0, 0, 0 ],
                [ 0, 1, 0, 0 ],
                [ 0, 0, 1, 0 ],
                [ 0, 0, 0, 1 ]
            ],
            origin, // [  x, y, z  ]
            transform = util.getPrefixedStyle( elem, 'transform' ),
            transformOrigin = util.getPrefixedStyle( elem, 'transformOrigin' );

        origin = transformOrigin.split( ' ' )
            .map( parseFloat );
        origin[2] = origin[2] || 0; // set the initial z

        if ( transform && transform !== 'none' ) {
            cssMatrix = transform.substring( transform.indexOf('(') + 1, transform.length - 1 );
            cssMatrix = cssMatrix.split(', ')
                .map( function( entry ) {
                    return util.truncate( parseFloat( entry ), 2 );
                });

            if ( cssMatrix.length === 6 ) { // 2D matrix
                cssMatrix.map( function( elem, index ) {
                    var row = index % 2,
                        col = Math.floor( index / 2 ) + ( index > 3 ? 1 : 0 );
                    matrix[ row ][ col ] = elem;
                });
            } else if ( cssMatrix.length === 16 ) { // 3D matrix
                cssMatrix.map( function( elem, index ) {
                    var row = index % 4,
                        col = Math.floor( index / 4 );
                    matrix[ row ][ col ] = elem;
                });
            } else {
                throw ( Error('elem has a transformation matrix that is not well defined') );
            }
        }

        return new CSSMatrix( matrix, origin, elem, cacheHint );
    }

    /**
     * Gets the transform matrix for a selected element
     * @param {Selector|Elemet} elem the element from which to grab the transform
     * @param {Object} cacheHint suggest the initial transform of the elem. @see transformCache
     * @return {CSSMatrix} a CSSMatrix representing the element's transform
     */
    function ssc( elem, cacheHint ) {
        return parseMatrix( elem, cacheHint );
    }

    ssc.Matrix = Matrix;
    ssc.CSSMatrix = CSSMatrix;
    ssc._utils = util; // for testing purposes

    return ssc;
});
