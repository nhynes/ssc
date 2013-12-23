/*
Copyright (C) 2013 Nick Hynes
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

//I was hoping you'd look at this :)

var animations = [];

/**
 * Calculates the arithmetic-geometric mean of two numbers
 *
 * @param a0 the first number
 * @param g0 the second number
 *
 * @return the AGM of the two numbers
 */
function agm(a0, g0, precision) {
	if(precision === undefined) {
		precision = 5;
	}
	var a1 = (a0+g0)/2;
	var g1 = Math.sqrt(a0*g0);
	if(precision === 0) {
		return (a1+g1)/2;
	}
	return agm(a1, g1, precision-1);
}

/**
 * Changes the transform origin of a component while maintaining
 * current position
 * @param (DOM Node) component the component for which to change the transform origin
 * @param ("percent|length percent|length") newOrigin the new transfor origin
 * TODO: make this function use qualitative strings as inputs
 */
function changeTransformOrigin(component, newOrigin) {
	var $component = $(component);

	var oldOrigin = $component.css("transform-origin");
	var currentTransform = getMatrix(component);

	var newOriginComponents = newOrigin.split(" ");
	var newOriginLeft = parseInt(newOriginComponents[0]);
	//Convert from % to px
	if(newOriginComponents[0].indexOf("%") !== -1) { 
		newOriginLeft *= $component.width()/100;
	}
	var newOriginTop = parseInt(newOriginComponents[1]);
	if(newOriginComponents[1].indexOf("%") !== -1) { 
		newOriginTop *= $component.height()/100;
	}

	var oldOriginLeft = parseInt(oldOrigin.split(" ")[0]);
	var oldOriginTop = parseInt(oldOrigin.split(" ")[1]);

	var angle = getAngle(currentTransform);
	var rotatedOldCoords = rotateMatrix([[oldOriginLeft, oldOriginTop, 1]], -angle);
	var rotatedNewCoords = rotateMatrix([[newOriginLeft, newOriginTop, 1]], -angle);

	//Find the distance in an unrotated coordinate system
	var dx = oldOriginLeft - newOriginLeft;
	var dy = oldOriginTop - newOriginTop;

	//Find the distance in the rotated coordinate system
	var dxPrime = rotatedNewCoords[0][0] - rotatedOldCoords[0][0];
	var dyPrime = rotatedNewCoords[0][1] - rotatedOldCoords[0][1];

	//Calculate the new translation
	var newCoords = translateMatrix(currentTransform, dx+dxPrime, dy+dyPrime);

	var originalTransition = $component.css("transition");
	$component.css("transition","none");;

	$component.css("transform-origin", newOrigin);
	$component.css("transform", toCSSMatrix(newCoords));

	//Hack to get browser to repaint component before re-enabling transitions
	var currentDisplay = $component.css("display");
	$component.css("display", "none");
	$component.css("display", currentDisplay);

	$component.css("transition", originalTransition);
}

/**
 * Returns the dot product of two vectors arrays
 *
 * @param first the first vector
 * @param second the second vector
 *
 * @return the dot product of the two vector arrays
 */
function dotProduct(first, second) {
	var result = 0;
	var minLenVector = Math.min(first.length, second.length);
	for(var i=0; i < minLenVector; i++) {
		result += first[i]*second[i];
	}
	return (Math.abs(result) < 1e-10 ? 0 : result);
}

/**
 * Changes the transform origin of the component to the bottom-most point,
 * moves the component to the bottom of the screen, and then makes it fall over
 *
 * @param (DOM Node) component the component for which to enable gravity
 * @param gravity the "acceleration due to gravity"
 */ 
function enableGravity(component, gravity, fallForever) {
	$component = $(component);
	if(gravity === undefined) {
		gravity = 9800; //TODO: use this variable
	}
	var matrix = getMatrix(component);
	var angle = getAngle(matrix);
	var sin = Math.sin(angle);
	var cos = Math.cos(angle);
	sin = fixRoundingErrors(sin);
	cos = fixRoundingErrors(cos);

	var bottomMostPoint = "";
	if(sin < 0) {
		bottomMostPoint = "100% ";
	} else if(sin > 0) {
		bottomMostPoint = "0% ";
	} else {
		bottomMostPoint = "50% ";
	}
	if(cos === 0) {
		bottomMostPoint += "50%";
	} else if(cos > 0) {
		bottomMostPoint += "100%";
	} else {
		bottomMostPoint += "0%";
	}
	$component.css("transition", "all "+.4+"s "+"cubic-bezier(.56, .09, .93, .85)");
	changeTransformOrigin(component, bottomMostPoint);
	moveToPoint(component, "current", $(window).height()+$(document).scrollTop());

	//Hack to get browser to repaint component before re-enabling transitions
	var currentDisplay = $component.css("display");
	$component.css("display", "none");
	$component.css("display", currentDisplay);

	setTimeout(function() { fallOver(component); }, 420);
}

/**
 * Makes a component fall in the direction it's leaning or stay at equilibrium
 * @param (DOM Node) component the component to have fall over
 */
function fallOver(component) {
	var matrix = getMatrix(component);
	var angle = getAngle(matrix);

	if(Math.abs(Math.cos(angle)) % .99 < .01 || Math.abs(Math.sin(angle)) % .99 < .01) {
		//Find the nearest angle
		var nearestAngle = (Math.round((angle + Math.PI/2) / (Math.PI/2)) - 1)*Math.PI/2
		rotateToAngle(component, nearestAngle);
		return; //equilibrium
	}

	$component.css("transition", "all "+(.25*Math.abs(Math.sin(angle)))+"s "+"ease-in");

	if(Math.cos(angle) < 0) {
		rotateToAngle(component, Math.PI);
	} else {
		rotateToAngle(component, 0);
	}
}

/**
 * Makes a number 0 or +/- 1 if it's close enough.
 * Useful when sin and cos return ~0 or +/-1 and it'd be helpful if they were.
 *
 * @param the number to fix
 *
 * @return the fix number
 */
function fixRoundingErrors(number) {
	if(Math.abs(number) % .99999 < .000001) {
		return Math.round(number);
	} else {
		return number;
	}
}

/**
 * Returns the transformation angle of the matrix
 *
 * @param matrix the [col][row] matrix from which to get the angle
 *
 * @return the transformation angle of the matrix (0 <= angle <= 2pi)
 */
function getAngle(matrix) {
	var currentAngle = Math.atan2(-matrix[0][1], matrix[0][0]);
	if(currentAngle < 0) {
		currentAngle += Math.PI*2;
	}
	return currentAngle;
}

/**
 * Returns the transformation matrix of a component
 * Convenience function for getting the transform of a
 * component and parsing the matrix.
 *
 * @param (DOM Node) component the component for which to get the transform matrix
 *
 * @return the [col][row] matrix representing the component's transform
 */
function getMatrix(component) {
	return parseMatrix($(component).css("transform"));
}

/**
 * Returns the x and y translations of a CSS2D matrix
 *
 * @param matrix the [col][row] matrix from which to get the translation
 *
 * @return [x, y] representing the translate component of the transform
 */
function getTranslation(matrix) {
	return [matrix[2][0], matrix[2][1]];
}

/**
 * Translates a component's transform origin to a given
 * on-screen, absolute, 2D coordinate
 *
 * @param (DOM Node) component the component to move
 * @param (number) the absolute left coordinate
 * @param (number) the absolute top coordinate
 */
function moveToPoint(component, left, top) {
	$component = $(component);
	var currentTransform = getMatrix(component);
	var currentTranslate = getTranslation(currentTransform);
	var angle = getAngle(currentTransform);

	var currentOrigin = $component.css("transform-origin").split(" ");
	var currentOriginLeft = parseFloat(currentOrigin[0]);
	var currentOriginTop = parseFloat(currentOrigin[1]);

	//Get the offset of the component's bounding rect
	var componentOffsetLeft = $component.offset().left;
	var componentOffsetTop = $component.offset().top;

	//Get the relative position of the center of the bounding rect
	var componentRect = component.getBoundingClientRect();
	var centroidLeft = componentOffsetLeft+componentRect.width/2;
	var centroidTop = componentOffsetTop+componentRect.height/2;

	//Difference between the origin and center vectors
	var dxOriginRect = currentOriginLeft - $component.width()/2;
	var dyOriginRect = currentOriginTop - $component.height()/2;

	//Difference in the rotated coordinate system
	var dOrigin = rotateMatrix([[dxOriginRect, dyOriginRect, 1]], -angle);

	//The unrotated, absolute offset of the transformation origin
	var originOffsetLeft = centroidLeft + dOrigin[0][0];
	var originOffsetTop = centroidTop + dOrigin[0][1];

	var dx = 0;
	if(left !== "current") {
		var dx = left-originOffsetLeft;
	}
	
	var dy = 0;
	if(top !== "current") {
		var dy = top-originOffsetTop;
	}

	var result = translateMatrix(getMatrix(component), dx, dy);
	$component.css("transform", toCSSMatrix(result));
}

/**
 * Returns the result of multiplying matrixA*matrixB
 *
 * @param matrixA the left matrix
 * @param matrixB the right matrix
 *
 * @return the result of A*B
 * Note: matrixA and matrixB are unmodified
 *
 * @throws exception if |colsA| != |rowsB|
 */
function multiplyMatrix(matrixA, matrixB) {
	var numColsA = matrixA.length;
	var numRowsA = matrixA[0].length;
	var numColsB = matrixB.length;
	var numRowsB = matrixB[0].length;
	if(numColsA !== numRowsB) {
		throw "|colsA| != |rowsB|";
	}

	//Initialize the product matrix
	var matrixC = [];
	for(var colC = 0; colC < numColsB; colC++) {
		matrixC[colC] = [];
	}

	//Do the multiplication
	for(var rowA = 0; rowA < numRowsA; rowA++) {
		var theRowA = [];
		for(var colA = 0; colA < numColsA; colA++) {
			theRowA[colA] = matrixA[colA][rowA];
		}
		for(var colB = 0; colB < numColsB; colB++) {
			var scalarProduct = dotProduct(theRowA, matrixB[colB]);
			matrixC[colB][rowA] = scalarProduct;
		}
	}
	return matrixC;
}

/**
 * Parses a CSS2D matrix and outputs a 2D array with the columns as the first elements
 * Ex: [[c1r1, c1r2],[c2r1, c2r2]]
 *
 * @param (CSS2D matrix) cssMatrix the CSS2D matrix to parse
 *
 * @return the matrix in array format
 */
function parseMatrix(cssMatrix) {
	cssMatrix = cssMatrix.substring(cssMatrix.indexOf("(")+1,cssMatrix.length-1).split(",");
	var matrix = [[],[],[]];
	var values = cssMatrix.map(function(val) { return parseFloat(val.trim()); });
	if(values.length < 6) {
		//No transformation matrix. Give it the identity
		for(var i=0; i < 6; i++) {
			var value = ((i === 0 || i === 3) ? 1 : 0);
			matrix[Math.floor(i/2)][i%2] = value;
		}
	} else {
		for(var i=0; i<values.length; i++) {
			//The first index is the column, the second is the row
			matrix[Math.floor(i/2)][i%2] = fixRoundingErrors(values[i]);
		}
	}
	matrix[0][2] = 0;
	matrix[1][2] = 0;
	matrix[2][2] = 1;
	return matrix;
}

/**
 * Rotates a CSS2D matrix by the specified angle (in radians)
 * @param matrix the matrix to rotate 
 * Note: the columns must be the first elements of the 2D array
 * @param angle the angle by which to rotate the matrix
 *
 * @return the matrix rotated by angle
 * Note: the original matrix is not modified
 */
function rotateMatrix(matrix, angle) {
	var rotationMatrix = [[Math.cos(angle), Math.sin(angle), 0], [-Math.sin(angle), Math.cos(angle), 0], [0, 0, 1]];
	return multiplyMatrix(rotationMatrix, matrix);
}

/**
 * Rotates a CSS2D matrix by the specified angle (in radians) disregarding translations
 * @param matrix the matrix to rotate 
 * Note: the columns must be the first elements of the 2D array
 * @param angle the angle by which to rotate the matrix
 *
 * @return the matrix rotated by angle
 * Note: the original matrix is not modified
 */
function rotateMatrixNoTranslate(matrix, angle) {
	var toRotate = $.extend(true, [], matrix);
	setTranslate(toRotate, 0, 0);
	var rotated = rotateMatrix(toRotate, angle);
	var originalTranslate = getTranslation(matrix);
	return translateMatrix(rotated, originalTranslate[0], originalTranslate[1]);
}

/**
 * Rotates the component to the given angle
 *
 * @param component the component to rotate
 * @param angle the new angle of the component (in radians)
 */
function rotateToAngle(component, angle) {
	$component = $(component);
	var currentTransform = parseMatrix($component.css("transform"));
	var currentAngle = getAngle(currentTransform);
	var delta = currentAngle-angle;
	var result = rotateMatrixNoTranslate(currentTransform, delta);
	$component.css("transform", toCSSMatrix(result));
}

/**
 * Sets the translate of a transformation matrix
 *
 * @param x the new x translate
 * @param y the new y translate
 *
 * @return a matrix translated to (x, y)
 * Note: the original matrix is unmodified
 */
function setTranslate(matrix, x, y) {
	var translated = $.extend(true, [], matrix); //deep copy of matrix
	matrix[2][0] = x;
	matrix[2][1] = y;
	return matrix;
}

/**
 * Stops the animation with the given ID
 * TODO: this needs to be more robust/elegant, but it's not a core feature
 */
function stopAnimation(id) {
	//This is kludgy
	animations[id] = "stopped"
}

/* Swings a component and returns a handle to the animation
 * @param component the DOM element to swing
 * @param damping how much to damp the periodic motion
 */
function swingComponent(component, damping, period, animationId) {
	if(animationId === undefined) {
		animationId = animations.length;
		animations[animationId] = "running";
	}
	if(animations[animationId] != "running") {
		return;
	}
	var gravity = 19800;
	if(damping === undefined) {
		damping = 0;
	}
	$component = $(component);
	var axisLength = $component.width();
	var angle = getAngle(getMatrix(component));
	var delta = (Math.PI - angle);
	delta -= Math.cos(delta)*damping;
	if(period === undefined) {
		var period = Math.PI*2/agm(1, Math.abs(Math.cos(angle)))*Math.sqrt(axisLength/gravity);
	}
	$component.css("transition", "all "+period+"s "+"ease-in-out");
	rotateToAngle(component, delta);
	if(Math.abs(Math.cos(delta)) < .2) {
		rotateToAngle(component, -Math.PI/2);
	}
	setTimeout(function() { swingComponent(component, damping, period, animationId); }, period*1000);
	return animationId;
}

/**
 * Converts a 3x3 matrix into a CSS2D matrix
 *
 * @param matrix the 3x3 matrix in [col][row] format to convert
 *
 * @return the matrix in CSS2D format
 */
function toCSSMatrix(matrix) {
	var cssMatrix = "matrix(";
	for(var col = 0; col<matrix.length; col++) {
		for(var row = 0; row<matrix[0].length-1; row++) {
			cssMatrix += fixRoundingErrors(matrix[col][row])+", ";
		}
	}
	cssMatrix = cssMatrix.substring(0, cssMatrix.length-2) + ")";
	return cssMatrix;
}

/**
 * Translates the transformation matrix
 *
 * @param dx the x offset
 * @param dy the y offset
 *
 * @return a matrix translated to (x + dx, y + dy)
 * Note: the original matrix is unmodified
 */
function translateMatrix(matrix, dx, dy) {
	var translated = $.extend(true, [], matrix); //deep copy of matrix
	translated[2][0] += dx;
	translated[2][1] += dy;
	return translated;
}