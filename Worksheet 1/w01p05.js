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

    // Define the number of triangles and vertices
    var numTriangles = 100; // More triangles = smoother circle
    var angleStep = (2 * Math.PI) / numTriangles;

    // Array to hold vertex positions
    var vertices = [];

    // Center of the circle
    vertices.push(0.0, 0.0, 0.0);

    // Generate the vertices for the circle
    for (var i = 0; i <= numTriangles; i++) {
        var angle = i * angleStep;
        vertices.push(Math.cos(angle) * 0.5); // X coordinate
        vertices.push(Math.sin(angle) * 0.5); // Y coordinate
        vertices.push(0.0);                   // Z coordinate
    }

    // Convert to Float32Array
    vertices = new Float32Array(vertices);

    // Create color array for the circle
    var colors = [];
    for (var i = 0; i <= numTriangles + 1; i++) {
        colors.push(1.0, 0.0, 0.0, 1.0);  // Red color for each vertex
    }
    colors = new Float32Array(colors);

    // Create a buffer and bind it for vertex positions
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Associate the position buffer with the vertex shader's vPosition attribute
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create a buffer and bind it for vertex colors
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    // Associate the color buffer with the vertex shader's vColor attribute
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Set the viewport and clear the canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    // Uniform location for the vertical movement
    var uYPosition = gl.getUniformLocation(program, "uYPosition");

    // Variables for animation
    var angle = 0;
    var amplitude = 0.5; // Amplitude of the bounce
    var speed = 1.0;     // Speed of the bounce

    // Render function
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Calculate the vertical position using a sine wave
        var yPosition = amplitude * Math.sin(angle);

        // Set the uniform for vertical movement
        gl.uniform1f(uYPosition, yPosition);

        // Draw the circle using the triangle fan
        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 3);

        // Increment the angle for the next frame
        angle += speed * 0.02;

        // Request another frame
        requestAnimationFrame(render);
    }

    // Start the rendering loop
    render();
}
