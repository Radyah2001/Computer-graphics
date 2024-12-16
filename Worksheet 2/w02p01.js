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

    // Array to store clicked points
    var pointsArray = [];

    // Create a buffer to store vertices
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    // Get the attribute location and enable it
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Set the viewport and clear the canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, pointsArray.length);
    }

    // Mouse click event handler to get mouse position and add points
    canvas.addEventListener("click", function(event) {
        var rect = canvas.getBoundingClientRect();

        // Get mouse position relative to the canvas
        var mouseX = event.clientX - rect.left;
        var mouseY = event.clientY - rect.top;

        // Convert to WebGL coordinates (-1 to 1)
        var x = (2 * mouseX) / canvas.width - 1;
        var y = 1 - (2 * mouseY) / canvas.height;

        // Store the new point
        pointsArray.push(vec3(x, y, 0.0));

        // Redraw the canvas
        render();
    });

    // Initial clear and draw the first set of points if necessary
    render();

}
