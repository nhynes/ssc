(function( factory ) {
    if ( typeof define === 'function' && define.amd ) {
        define(function() {
            return factory();
        });
    } else {
        window.ssc = factory();
    }
})(function() {

    // {{ Utilities

    function _getElem( elem ) {
        if ( !(elem instanceof Element) ) {
            if ( typeof elem === 'string' ) {
                elem = document.querySelector( elem );
                if ( !elem ) { throw( Error('elem selector does not refer to a valid Element') ); }
            } else { throw( Error('elem must be either an Element or a CSS Selector') ); }
        }
        return elem;
    }

    function _truncate( number, decimalPlaces ) {
        var exp = Math.pow( 10, decimalPlaces );
        return Math.round( number *  exp ) / exp;
    }

    function _cloneMatrix( matrix ) {
        var clonedMatrix = [];
        matrix.map( function( entry ) {
            var clonedEntry;
            if ( entry instanceof Array ) {
                clonedEntry = [];
                entry.map( function( col ) { clonedEntry.push( col ); });
            } else {
                clonedEntry = entry;
            }
            clonedMatrix.push( clonedEntry );
        });
        return clonedMatrix;
    }

    function _padVector( array, length, padding ) {
        var paddedVector = [];
        length = length || 3;
        padding = ( arguments.length >= 3 ? padding : 0 );
        for( var i = 0; i < length; i++ ) {
            paddedVector.push( ( (array[ i ] || array[ i ] === 0) ? array[ i ] : padding ) );
        }
        return paddedVector;
    }

    function _parseArgs( args, padLen, padWith ) {
        // parses up to three arguments since there are only three dimensions
        args = Array.prototype.slice.call(args);
        var toParse = ( args[0] instanceof Array ? args[0] : args ).slice( 0, 3 );
        return _padVector( toParse, padLen, padWith );
    }

    function _zip() {
        var arrays = Array.prototype.slice.call(arguments);
        var minLenArray = arrays.reduce( function( minLen, array ) {
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
        var capitalizedPropName = propName.charAt(0).toUpperCase() + propName.slice(1);
        VENDORS.map( function( vendor ) {
            elem.style[ vendor + capitalizedPropName ] = value;
            elem.style.propName = value;
        }, undefined );
    }

    function _getPrefixedStyle( elem, propName ) {
        propName = propName.replace( /[A-Z]/g, function( match ) {
            return '-' + match.toLowerCase();
        });
        propName = propName.toLowerCase();
        var styles = window.getComputedStyle( elem );
        var vendorValue;
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
        console.log( origin );
        this._matrix = matrix;
        this._origin = origin;
        this._elem = elem;
        this._elemRect = elem.getBoundingClientRect();
    }

    /**
      * Returns a copy of this CSS matrix
      */
    CSSMatrix.prototype.clone = function() {
        return new CSSMatrix( _cloneMatrix( this.matrix ), this.origin, this._elem );
    };

    /**
      * Returns a copy of this matrix translated by <dx, dy, dz>
      * Arguments can be either a vector (e.g. [ x, y, z ]) or scalars.
      * Unspecified arguments default to zero.
      */
    CSSMatrix.prototype.translate = function() {
        var translateBy = _parseArgs( arguments );
        var currentTranslate = this.getTranslate();
        return this.setTranslate( _zip( currentTranslate, translateBy ).map( function( vects ) {
            return ( vects[1] !== undefined ? vects[0] + vects[1] : 0 );
        }) );
    };

    /**
      * Translates the matrix to <x, y, z>
      * Arguments can be either a vector (e.g. [ x, y, z ]) or scalars.
      * Unspecified arguments default to zero.
      */
    CSSMatrix.prototype.setTranslate = function() {
        var translateVector = _parseArgs( arguments );
        var translatedMatrix = _cloneMatrix( this._matrix );
        translateVector.map( function( elem, index ) {
            translatedMatrix[ index ][ 3 ] = elem;
        });
        return new CSSMatrix( translatedMatrix, this._origin, this._elem );
    };

    /**
      * Returns the current translation represented by this matrix: [ x, y, z ]
      */
    CSSMatrix.prototype.getTranslate = function() {
        return [
            this._matrix[0][3],
            this._matrix[1][3],
            this._matrix[2][3]
        ];
    };

    /**
      * Returns a copy of this matrix scaled by <dx, dy, dz>
      * Arguments can be either a vector (e.g. [ x, y, z ]) or scalars.
      * Unspecified arguments default to one.
      */
    CSSMatrix.prototype.scale = function() {
        var scaleVector = _parseArgs( arguments, 4, 1 );
        var scaleMatrix = [
            [ scaleVector[0], 0, 0, 0 ],
            [ 0, scaleVector[1], 0, 0 ],
            [ 0, 0, scaleVector[2], 0 ],
            [ 0, 0, 0, 1 ]
        ];
        return new CSSMatrix( scaleMatrix, this._origin, this._elem ).multiply( this._matrix );
    };

    /**
      * Returns a copy of this matrix scaled to x, y, z
      * Arguments can be either a vector (e.g. [ x, y, z ]) or scalars.
      * Unspecified arguments default to zero.
      */
    CSSMatrix.prototype.setScale = function() {
        var scaleVector = _parseArgs( arguments, 4, 1 );
        var scaledMatrix = _cloneMatrix( this._matrix );
        scaleVector.map( function( elem, index ) {
            scaledMatrix[ index ][ index ] = elem;
        });
        return new CSSMatrix( scaledMatrix, this._origin, this._elem );
    };

    /**
      * Returns the current scale represented by this matrix: [ x, y, z ]
      */
    CSSMatrix.prototype.getScale = function() {
        return [
            this._matrix[0][0],
            this._matrix[1][1],
            this._matrix[2][2]
        ];
    };

    /**
      * Changes the transformation origin while maintaining the current transform relative to
      * the screen.
      * Values of x and y are relative to the untransformed bounding box.
      *
      * Arguments are specified in pixels, keywords, or percents and can be an array or positional.
      * Unspecified arguments default to the previous value.
      */
    CSSMatrix.prototype.changeOrigin = function() {
        var newOrigin = [];
        if ( typeof arguments[0] === 'string' ) {
            arguments[0].split(' ').map( function( component, index, components ) {
                if ( component.indexOf('%') !== -1 ) {
                    var dimension = ( index === 0 ?
                        this._elemRect.width : this._elemRect.height );
                    newOrigin[ index ] = dimension * parseFloat( component ) / 100;
                } else {
                    switch( component.toLowerCase() ) {
                        case 'left':
                            newOrigin[0] = 0;
                            break;
                        case 'right':
                            newOrigin[0] = this._elemRect.width;
                            break;
                        case 'top':
                            newOrigin[1] = 0;
                            break;
                        case 'bottom':
                            newOrigin[1] = this._elemRect.height;
                            break;
                        case 'center':
                            if ( components.length === 1 ) {
                                newOrigin = [ this._elemRect.width / 2, this._elemRect.height / 2 ];
                            } else {
                                if ( index === 0 ) { newOrigin[0] = this._elemRect.width / 2; }
                                else { newOrigin[1] = this._elemRect.height / 2; }
                            }
                            break;
                        default:
                            newOrigin[2] = parseInt( component, 10 );
                    }
                }
            }, this );
        } else {
            newOrigin = _parseArgs( arguments, 3, undefined );
        }
        newOrigin[2] = newOrigin[2] || 0;

        var delta = _zip( this._origin, newOrigin ).map( function( components ) {
            return ( components[1] !== undefined ? components[1] - components[0] : 0 );
        });

        console.log( this._origin, newOrigin );

        this._origin = _zip( this._origin, newOrigin ).map( function( components ) {
            return ( components[1] !== undefined ? components[1] : components[0] );
        });

        console.log( this.getOrigin(), delta );

        return this; //.translate( delta );
    };

    /**
      * Multiplies the CSS matrix by a given matrix; preferably a 4xn matrix.
      */
    CSSMatrix.prototype.multiply = function( otherMatrix ) {
        var otherMatrixT;
        if ( otherMatrix[0].length ) {
            otherMatrixT = _zip.apply( this, otherMatrix );
        } else {
            otherMatrixT = [ otherMatrix ];
        }

        var multipliedMatrix = this._matrix.map( function( row ) {
            return otherMatrixT.map( function( col ) {
                return _zip( row, col )
                    .map( function( components ) { return components[0] * components[1]; })
                    .reduce( function( sum, val ) { return sum + val; }, 0 );
            });
        });

        return new CSSMatrix( multipliedMatrix, this._origin, this._elem );
    };

    /**
      * Params:
      * elem {String|Element} - Takes an element or a CSS selector for an element and returns a
                                CSSMatrix
      *
      * Returns a CSSMatrix
      */
    function getMatrix( elem ) {
        elem = _getElem( elem );

        var cssMatrix;
        var matrix = [
            [ 1, 0, 0, 0 ],
            [ 0, 1, 0, 0 ],
            [ 0, 0, 1, 0 ],
            [ 0, 0, 0, 1 ]
        ];
        var origin; // [ x, y, z ]

        var transform = _getPrefixedStyle( elem, 'transform');
        var transformOrigin = _getPrefixedStyle( elem, 'transformOrigin');
        origin = transformOrigin.split(' ').map( parseFloat );
        origin[2] = origin[2] || 0; // set the initial z

        if ( transform && transform !== 'none' ) {
            cssMatrix = transform.substring( transform.indexOf('(') + 1, transform.length - 1 );
            cssMatrix = cssMatrix.split(', ').map( function( entry ) {
                return _truncate( parseFloat( entry ), 2 );
            });

            if ( cssMatrix.length === 6 ) { // 2D matrix
                cssMatrix.map( function( elem, index ) {
                    var row = index % 2;
                    var col = Math.floor( index / 2 ) + ( index > 3 ? 1 : 0 );
                    matrix[ row ][ col ] = elem;
                });
            } else if ( cssMatrix.length === 16 ) { // 3D matrix
                cssMatrix.map( function( elem, index ) {
                    var row = index % 4;
                    var col = Math.floor( index / 4 );
                    matrix[ row ][ col ] = elem;
                });
            } else {
                throw( Error('elem has a transformation matrix that is not well defined') );
            }
        }

        return new CSSMatrix( matrix, origin, elem );
    }

    /**
      * Returns a matrix3d representing the CSS transform
      */
    CSSMatrix.prototype.toCSSMatrix = function() {
        var values = _zip.apply( this, this._matrix ).map( function( col ) {
            return col.map(function( elem ) {
                return _truncate( elem, 2 );
            }).join(', ');
        }).join(', ');
        return 'matrix3d(' + values + ')';
    };

    /**
      * Returns the CSS transform origin associated with this matrix
      */
    CSSMatrix.prototype.getOrigin = function() {
        return this._origin[0] + "px " + this._origin[1] + "px " + this._origin[2];
    };

    CSSMatrix.prototype.apply = function( elem ) {
        elem = ( elem ? _getElem( elem ) : this._elem );

        _setPrefixedStyle( elem, 'transform', this.toCSSMatrix() );
        _setPrefixedStyle( elem, 'transformOrigin', this.getOrigin() );
    };

    function ssc() {
        return getMatrix.apply( this, arguments );
    }

    ssc.prototype.CSSMatrix = CSSMatrix;

    return ssc;
});
