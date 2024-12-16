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

    // Array to store clicked points and their colors
    var pointsArray = [];
    var colorsArray = [];

    // Create buffers to store vertices and colors
    var vertexBuffer = gl.createBuffer();  // Changed from 'buffer' to 'vertexBuffer'
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

        // Log clear color and point color to compare
        console.log("Clear color:", clearColor);
        console.log("Point color:", pointColor);
        console.log("Point color alpha value:", pointColor[3]);

        // Add the point and its color to the arrays
        pointsArray.push(vec3(x, y, 0.0));
        colorsArray.push(vec4(pointColor));

        // Debugging logs
        console.log("Added point:", [x, y, 0.0]);
        console.log("Points array:", pointsArray);
        console.log("Colors array:", colorsArray);

        // Redraw the canvas with the new point
        render();
    });

    // Clear button event handler
    document.getElementById("clear-btn").addEventListener("click", function() {
        pointsArray = [];
        colorsArray = [];
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
        gl.drawArrays(gl.POINTS, 0, pointsArray.length);
    }

    // Initial clear and setup
    clearCanvas();

}
