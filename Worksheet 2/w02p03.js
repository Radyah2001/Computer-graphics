// Function to load the shader source from the HTML script tags
function getShaderSource(id) {
    return document.getElementById(id).textContent;
}

// Function to initialize and compile the shaders
function initShaders(gl, vertexShaderSource, fragmentShaderSource) {
    function compileShader(gl, shaderSource, shaderType) {
        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    var vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    var fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

window.onload = function init() {    
    var canvas = document.getElementById("gl-canvas");
    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    // Get shader source from HTML
    var vertexShaderSource = getShaderSource("vertex-shader");
    var fragmentShaderSource = getShaderSource("fragment-shader");

    // Initialize shaders and program
    var program = initShaders(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    let drawingMode = 'point'; // Default mode
    let trianglePoints = [];   // Track clicked points in triangle mode

    document.getElementById("point-mode-btn").addEventListener("click", function() {
        drawingMode = 'point';
        trianglePoints = []; // Clear any incomplete triangles when switching
    });
    
    document.getElementById("triangle-mode-btn").addEventListener("click", function() {
        drawingMode = 'triangle';
    });

    // Array to store clicked points and their colors
    var pointsArray = [];
    var colorsArray = [];

    // Create buffers to store vertices and colors
    var vertexBuffer = gl.createBuffer();
    var colorBuffer = gl.createBuffer();

    // Get attribute locations
    var vPosition = gl.getAttribLocation(program, "vPosition");
    var vColor = gl.getAttribLocation(program, "vColor");

    // Default clear color (cornflower blue)
    var clearColor = [0.3921, 0.5843, 0.9294, 1.0];

    // Function to update clear color
    document.getElementById("clear-color").addEventListener("input", function(event) {
        var hex = event.target.value;
        clearColor = hexToRgbArray(hex);
        clearCanvas();
    });

    // Function to convert hex color to RGBA array
    function hexToRgbArray(hex) {
        var bigint = parseInt(hex.slice(1), 16);
        var r = ((bigint >> 16) & 255) / 255;
        var g = ((bigint >> 8) & 255) / 255;
        var b = (bigint & 255) / 255;
        return [r, g, b, 1.0];
    }

    // Mouse click event handler
    canvas.addEventListener("click", function(event) {
        var rect = canvas.getBoundingClientRect();
        var mouseX = event.clientX - rect.left;
        var mouseY = event.clientY - rect.top;

        // Convert to WebGL coordinates (-1 to 1)
        var x = (2 * mouseX) / canvas.width - 1;
        var y = 1 - (2 * mouseY) / canvas.height;

        // Get selected point color
        var pointColorHex = document.getElementById("point-color").value;
        var pointColor = hexToRgbArray(pointColorHex);

        if (drawingMode === 'point') {
            // Add the two triangles forming a square
            addPointAsTriangles(vec3(x, y, 0.0), pointColor);
        } else if (drawingMode === 'triangle') {
            // Add point to trianglePoints array
            trianglePoints.push({ position: vec3(x, y, 0.0), color: pointColor });
    
            if (trianglePoints.length === 3) {
                // When three points are clicked, draw the triangle
                addTriangle(trianglePoints);
                trianglePoints = []; // Clear the array after drawing
            }
        }

        // Redraw the canvas with the new point
        render();
    });

    // Clear button event handler
    document.getElementById("clear-btn").addEventListener("click", function() {
        pointsArray = [];
        colorsArray = [];
        trianglePoints = [];
        clearCanvas();
    });

    // Function to clear the canvas
    function clearCanvas() {
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // Function to render the points
    function render() {
        clearCanvas();

        // Bind vertex buffer, update data, and enable attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); 
        gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        // Bind color buffer, update data, and enable attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);  // Ensure we bind the correct buffer before updating it
        gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vColor);

        // Draw the points
        gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);
    }

    function addPointAsTriangles(position, color) {
        const size = 0.05;  // Define size for the square
    
        // Calculate the vertices of the two triangles that form a square
        const vertices = [
            vec3(position[0] - size, position[1] - size, 0.0),
            vec3(position[0] + size, position[1] - size, 0.0),
            vec3(position[0] + size, position[1] + size, 0.0),
            vec3(position[0] - size, position[1] - size, 0.0),
            vec3(position[0] + size, position[1] + size, 0.0),
            vec3(position[0] - size, position[1] + size, 0.0)
        ];
    
        // Add two triangles (6 vertices) to pointsArray
        for (let i = 0; i < vertices.length; i++) {
            pointsArray.push(vertices[i]);
            colorsArray.push(vec4(color)); // Add color to colorsArray
        }
    }

    function addTriangle(trianglePoints) {
        for (let i = 0; i < 3; i++) {
            pointsArray.push(trianglePoints[i].position);
            colorsArray.push(vec4(trianglePoints[i].color));
        }
    }

    // Initial clear and setup
    clearCanvas();

}
