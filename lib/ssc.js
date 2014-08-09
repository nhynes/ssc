( function( ssc ) {
    'use strict';
    if ( typeof define === 'function' && define.amd ) {
        define( ssc );
    } else {
        window.ssc = ssc();
    }
})( function() {
    'use strict';

    // {{ Utilities

    function _getElem( elem ) {
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
    }

    function _truncate( number, decimalPlaces ) {
        var exp = Math.pow( 10, decimalPlaces );
        return Math.round( number * exp ) / exp;
    }

    function _cloneMatrix( matrix ) {
        var clonedMatrix = [];
        matrix.map( function( entry ) {
            var clonedEntry;
            if ( entry instanceof Array ) {
                clonedEntry = [];
                entry.map( function( col ) {
                    clonedEntry.push( col );
                });
            } else {
                clonedEntry = entry;
            }
            clonedMatrix.push( clonedEntry );
        });
        return clonedMatrix;
    }

    function _padVector( array, length, padding ) {
        var i,
            paddedVector = [];

        length = length || 3;
        padding = ( padding !== undefined ? padding : 0 );
        for ( i = 0; i < length; i++ ) {
            paddedVector.push( ( (array[ i ] || array[ i ] === 0) ? array[ i ] : padding ) );
        }
        return paddedVector;
    }

    function _parseArgs( args, padLen, padWith ) {
        // parses up to three arguments since there are only three dimensions
        args = Array.prototype.slice.call( args );
        var toParse = ( args[0] instanceof Array ? args[0] : args )
            .slice( 0, 3 );
        return _padVector( toParse, padLen, padWith );
    }

    function _parseOriginArgs( args, elemDims ) {
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
                                    origin = [ elemDims.width / 2,
                                        elemDims.height / 2
                                    ];
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
            origin = _parseArgs( args, 3, null );
        }
        origin[2] = origin[2] || 0;

        return origin;
    }

    function _zip() {
        var arrays = Array.prototype.slice.call( arguments ),
            minLenArray = arrays.reduce( function( minLen, array ) {
                return ( minLen.length < array.length ? minLen : array );
            });

        return minLenArray.map( function( _, index ) {
            return arrays.map( function( array ) {
                return array[ index ];
            });
        });
    }

    var VENDORS = [ 'Moz', 'webkit', 'ms', 'O' ];

    function _setPrefixedStyle( elem, propName, value ) {
        var capitalizedPropName = propName.charAt( 0 )
            .toUpperCase() + propName.slice( 1 );
        VENDORS.map( function( vendor ) {
            elem.style[ vendor + capitalizedPropName ] = value;
            elem.style.propName = value;
        }, undefined );
    }

    function _getPrefixedStyle( elem, propName ) {
        var vendorValue,
            styles = window.getComputedStyle( elem );

        VENDORS.map( function( vendor ) {
            vendorValue = styles[ '-' + vendor + '-' + propName ] || vendorValue;
        }, undefined );
        return styles[ propName ] || vendorValue;
    }

    // }}

    /**
     * Represents a matrix3d in row-major order
     */
    function CSSMatrix( matrix, origin, elem ) {
        this._matrix = matrix;
        this._origin = origin;
        this._elem = elem;
    }

    CSSMatrix.prototype = {
        /**
         * Returns a copy of this CSS matrix
         */
        clone: function() {
            return new CSSMatrix( _cloneMatrix( this.matrix ), this.origin, this._elem );
        },

        /**
         * Returns a copy of this matrix translated by <dx, dy, dz>
         * Arguments can be either a vector ( e.g. [  x, y, z  ] ) or scalars.
         * Unspecified arguments default to zero.
         */
        translate: function() {
            var translateBy = _parseArgs( arguments ),
                currentTranslate = this.getTranslate();

            return this.setTranslate( _zip( currentTranslate, translateBy )
                .map( function( vects ) {
                    return ( vects[1] !== undefined ? vects[0] + vects[1] : 0 );
                }) );
        },

        /**
         * Translates the matrix to <x, y, z>
         * Arguments can be either a vector ( e.g. [  x, y, z  ] ) or scalars.
         * Unspecified arguments default to zero.
         */
        setTranslate: function() {
            var translateVector = _parseArgs( arguments ),
                translatedMatrix = _cloneMatrix( this._matrix );

            translateVector.map( function( elem, index ) {
                translatedMatrix[ index ][3] = elem;
            });
            return new CSSMatrix( translatedMatrix, this._origin, this._elem );
        },

        /**
         * Returns the current translation represented by this matrix: [  x, y, z  ]
         */
        getTranslate: function() {
            return [
                this._matrix[0][3],
                this._matrix[1][3],
                this._matrix[2][3]
            ];
        },

        /**
         * Returns a copy of this matrix scaled by <dx, dy, dz>. Does not translate.
         * Arguments can be either a vector ( e.g. [  x, y, z  ] ) or scalars.
         * Unspecified arguments default to one.
         */
        scale: function() {
            var scaleCSSMatrix,
                scaleVector = _parseArgs( arguments, 4, 1 ),
                scaleMatrix = [
                    [ scaleVector[0], 0, 0, 0 ],
                    [ 0, scaleVector[1], 0, 0 ],
                    [ 0, 0, scaleVector[2], 0 ],
                    [ 0, 0, 0, 1 ]
                ],
                untranslated = this.setTranslate( 0, 0, 0 ),
                currentTranslate = this.getTranslate();
            scaleCSSMatrix = new CSSMatrix( scaleMatrix, this._origin, this._elem );
            return scaleCSSMatrix.multiply( untranslated._matrix ).translate( currentTranslate );
        },

        /**
         * Returns a copy of this matrix scaled to x, y, z
         * Arguments can be either a vector ( e.g. [  x, y, z  ] ) or scalars.
         * Unspecified arguments default to zero.
         */
        setScale: function() {
            var scaleVector = _parseArgs( arguments, 4, 1 ),
                scaledMatrix = _cloneMatrix( this._matrix );

            scaleVector.map( function( elem, index ) {
                scaledMatrix[ index ][ index ] = elem;
            });
            return new CSSMatrix( scaledMatrix, this._origin, this._elem );
        },

        /**
         * Returns the current scale represented by this matrix: [  x, y, z  ]
         */
        getScale: function() {
            return [
                this._matrix[0][0],
                this._matrix[1][1],
                this._matrix[2][2]
            ];
        },

        /**
         * Changes the transform origin while maintaining the current onscreen position
         * Values of x and y are relative to the untransformed bounding box.
         *
         * Arguments are pixels, keywords, or percents and can be an array or positional.
         * Unspecified arguments default to the previous value.
         */
        changeOrigin: function() {
            var delta,
                elemDims = {
                    width: parseFloat( window.getComputedStyle( this._elem ).width ),
                    height: parseFloat( window.getComputedStyle( this._elem ).height )
                },
                newOrigin = _parseOriginArgs( arguments, elemDims ),
                currentScale = this.getScale();

            delta = _zip( this._origin, newOrigin, currentScale )
                .map( function( comps ) {
                    var deltaOrigin = ( comps[1] !== null ? comps[1] - comps[0] : 0 );
                    return ( comps[2] - 1 ) * deltaOrigin;
                });

            this._origin = _zip( this._origin, newOrigin )
                .map( function( components ) {
                    return ( components[1] !== null ? components[1] : components[0] );
                });

            return this.translate( delta );
        },

        /**
         * Returns an array vector representing the origin of this transformation
         *
         * Arguments specified positionally are in px; string arg follows CSS spec
         * Unspecified arguments default to the previous value.
         */
        setOrigin: function() {
            var elemDims = {
                width: parseFloat( window.getComputedStyle( this._elem ).width ),
                height: parseFloat( window.getComputedStyle( this._elem ).height )
            },
            newOrigin = _parseOriginArgs( arguments, elemDims );
            return new CSSMatrix( this._matrix, newOrigin, this._elem );
        },

        /**
         * Returns an array vector representing the origin of this transformation
         */
        getOrigin: function() {
            return _cloneMatrix( this._origin );
        },

        /**
         * Multiplies the CSS matrix by a given matrix; preferably a 4xn matrix.
         */
        multiply: function( otherMatrix ) {
            var otherMatrixT,
                multipliedMatrix;

            if ( otherMatrix[0].length ) {
                otherMatrixT = _zip.apply( this, otherMatrix );
            } else {
                otherMatrixT = [ otherMatrix ];
            }

            multipliedMatrix = this._matrix.map( function( row ) {
                return otherMatrixT.map( function( col ) {
                    return _zip( row, col )
                        .map( function( components ) {
                            return components[0] * components[1];
                        })
                        .reduce( function( sum, val ) {
                            return sum + val;
                        }, 0 );
                });
            });

            return new CSSMatrix( multipliedMatrix, this._origin, this._elem );
        },

        /**
         * Returns a matrix3d representing the CSS transform
         */
        toTransformMatrix: function() {
            var values = _zip.apply( this, this._matrix )
                .map( function( col ) {
                    return col.map( function( elem ) {
                        return _truncate( elem, 2 );
                    }).join( ', ' );
                }).join( ', ' );
            return 'matrix3d(' + values + ')';
        },

        /**
         * Returns the CSS transform origin associated with this matrix
         */
        getOriginCSS: function() {
            return this._origin[0] + 'px ' + this._origin[1] + 'px ' + this._origin[2];
        },

        apply: function( elem ) {
            elem = ( elem ? _getElem( elem ) : this._elem );

            _setPrefixedStyle( elem, 'transform', this.toTransformMatrix() );
            _setPrefixedStyle( elem, 'transformOrigin', this.getOriginCSS() );

            return this;
        }
    };

    /**
     * Params:
     * elem {String|Element} - Returns a CSSMatrix for a given element or CSS selector
     *
     * Returns a CSSMatrix
     */
    function getMatrix( elem ) {
        elem = _getElem( elem );

        var cssMatrix,
            matrix = [
                [ 1, 0, 0, 0 ],
                [ 0, 1, 0, 0 ],
                [ 0, 0, 1, 0 ],
                [ 0, 0, 0, 1 ]
            ],
            origin, // [  x, y, z  ]
            transform = _getPrefixedStyle( elem, 'transform' ),
            transformOrigin = _getPrefixedStyle( elem, 'transformOrigin' );

        origin = transformOrigin.split( ' ' )
            .map( parseFloat );
        origin[2] = origin[2] || 0; // set the initial z

        if ( transform && transform !== 'none' ) {
            cssMatrix = transform.substring( transform.indexOf('(') + 1, transform.length - 1 );
            cssMatrix = cssMatrix.split(', ')
                .map( function( entry ) {
                    return _truncate( parseFloat( entry ), 2 );
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

        return new CSSMatrix( matrix, origin, elem );
    }

    function ssc() {
        return getMatrix.apply( undefined, arguments );
    }

    ssc.CSSMatrix = CSSMatrix;

    return ssc;
});
