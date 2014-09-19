# SSC

A CSS 3D transformation library.

## Example

```js
ssc('#test')
  .translate( 42, 69, 99 )
  .rotate( [ 0, 0, 1 ], Math.PI / 4 )
  .scale( 2, 2 )
  .changeOrigin('bottom right')
  .apply();
```

## API

**ssc( elem:Element|Selector, cacheHint:Object ):CSSMatrix**

This is where the fun begins. Gets or creates the CSSMatrix for the selected element.

When selecting an element that has complex transforms (i.e. rotates+scales or skews) applied by not-this-library, it will help to give SSC hints as to what they were to avoid costly and potentially inaccurate polar decomposition.  
For `cacheHint`, supported values are:

* `rotate` - `{ axis: [ x:Number, y:Number, z:Number ], angle:Number (in radians) }`
* `scale` - `[ x, y, z ]`

### CSSMatrix

A CSSMatrix is an immutable representation of a 4x4 CSS transformation matrix. This class inherits from Matrix.

**CSSMatrix( matrix:Matrix, origin:Array, elem:Element, cacheHint:Object ):CSSMatrix**

* `matrix` - a 4x4 Matrix (see below) or 4x4 row-major array that represents the element's transform
* `origin` - the transformation origin [ x, y, z ] in pixels
* `elem` - the Element to which this transformation matrix will be applied
* `cacheHint` - see above

**clone():CSSMatrix**

Returns a completely new copy of this CSSMatrix

**apply( elem:Element|Selector ):CSSMatrix**

Applies this CSSMatrix to the originally selected element or the one provided as an argument.

**translate( dx:Number, dy:Number, dz:Number ):CSSMatrix**  
**translate([ dx, dy, dz]):CSSMatrix**

Returns a new CSSMatrix that is the result of translating this matrix by dx, dy, dz

**setTranslate( x:Number, y:Number, z:Number ):CSSMatrix**  
**setTranslate([ x, y, z ]):CSSMatrix**

Returns a new CSSMatrix based on this one, but translated to x, y, z

**getTranslate():Array**

Returns the translation represented by this CSSMatrix as `[ x:Number, y:Number, z:Number ]`

**scale( dx:Number, dy:Number, dz:Number ):CSSMatrix**  
**scale([ dx, dy, dz]):CSSMatrix**

Returns a new CSSMatrix that is the result of scaling this matrix by dx, dy, dz

**setScale( x:Number, y:Number, z:Number ):CSSMatrix**  
**setScale([ x, y, z ]):CSSMatrix**

Returns a new CSSMatrix based on this one, but scaled to x, y, z.  
Note: this will affect any applied rotations

**getScale():Array**

Returns the scale of this matrix as `[ scaleX:Number, scaleY:Number, scaleZ:Number ]`.

**rotate( axis:Array, angle:Number ):CSSMatrix**

Returns a copy of this matrix rotated by `angle` in radians around the vector `axis` `[ x:Number, y:Number, z:Number ]`

**setRotate( axis:Array, angle:Number ):CSSMatrix**

Returns a copy of this matrix rotated to `angle` (in radians) around the vector `axis`, `[ x:Number, y:Number, z:Number ]`.

**getRotate():Object**

Gets the rotation of this matrix. Returns the object:

* `axis` - the axis of rotation `[ x, y, z ]`
* `angle` - the angle of rotation in radians

Note: multiple rotations will be decomposed into a single rotation

**changeOrigin( x:Number, y:Number, z:Number ):CSSMatrix**  
**changeOrigin([ x:Number, y:Number, z:Number ]):CSSMatrix**  
**changeOrigin( cssString:String ):CSSMatrix**

Returns a CSSMatrix with an updated transformation origin without changing the on-screen position.

For a description of the cssString argument option, [RTFM](http://www.w3.org/TR/css3-transforms/#transform-origin-property)!

**setOrigin(same args as above):CSSMatrix**

Like `changeOrigin` but _does_ change the on-screen position.

**getOrigin():Array**

Returns the transformation origin `[ x:Number, y:Number, z:Number ]`.

**polarDecompose():Object**

Polar decomposes this matrix into a unitary rotation matrix and a stretching matrix.  
M = UP

Returns the object:

* `u:Matrix` - the unitary rotation Matrix (the rotate)
* `p:Matrix` - the stretching matrix (the scale)

Note: multiple rotates will be collapsed into one and shear will be lost

**reset():CSSMatrix**

Returns a new CSSMatrix with the same element and origin, but with all of the other transformations reset.

**toTransformMatrix():String(CSSMatrix3D)**

Returns the CSS matrix3d string represented by this CSSMatrix.

## Matrix

**multply( other:Matrix ):CSSMatrix**

Returns a new CSSMatrix that is the result of multiplying this matrix by another Matrix

**Matrix( matrix:Array[Array] )**  
**Matrix( n, m )**

Creates a new Matrix from a provided 2D, row-major array or a unitary, diagonal matrix of size nxm

**clone():Matrix**

Returns a brand-new Matrix that's just like this one except not this one.

**get( i:Number, j:Number ):Number**

Returns the entry at row i, column j (0 indexed)

**set( i:Number, j:Number, elem:Number ):Matrix**

Returns a Matrix with the value at [i][j] set to `elem`

**equals( other:Matrix, tolerance:Number ):Boolean**

Returns true iff the two matrices are element-wise equal with to a given +/- tolerance

**add( other:Matrix ):Matrix**

Returns a new Matrix that is this one added element-wise to the other Matrix.

**subtract( other:Matrix ):Matrix**

Does the opposite of add.

**multiply( other:Matrix ):Matrix**

Returns the multiplication of this matrix with another as a new Matrix

**det():Number**

Returns the determinant of this Matrix

**transpose():Matrix**

Returns the transpose of this Matrix

**inv():Matrix**

Returns the inverse of this Matrix

**submatrix( rowRange:Array, colRange:Array ):Matrix**

`start` is zero indexed

* `rowRange` - `[ start:Number, end:Number ]`
* `colRange` - `[ start:Number, end:Number ]`
