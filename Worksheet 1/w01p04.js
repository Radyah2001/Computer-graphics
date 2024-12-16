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

    // Define vertices for the square (two triangles)
    var vertices = new Float32Array([
        -0.5, -0.5, 0.0,  // Bottom left
         0.5, -0.5, 0.0,  // Bottom right
         0.5,  0.5, 0.0,  // Top right
        -0.5, -0.5, 0.0,  // Bottom left (2nd triangle)
         0.5,  0.5, 0.0,  // Top right
        -0.5,  0.5, 0.0   // Top left
    ]);

    // Define colors for each vertex
    var colors = new Float32Array([
        1.0, 0.0, 0.0, 1.0,  // Red
        0.0, 1.0, 0.0, 1.0,  // Green
        0.0, 0.0, 1.0, 1.0,  // Blue
        1.0, 0.0, 0.0, 1.0,  // Red (2nd triangle)
        0.0, 0.0, 1.0, 1.0,  // Blue
        0.0, 1.0, 0.0, 1.0   // Green
    ]);

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

    // Set the viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    // Rotation matrix uniform location
    var uRotationMatrix = gl.getUniformLocation(program, "uRotationMatrix");

    // Define the rotation angle
    var angle = 0;

    // Render function
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Calculate the rotation matrix
        var radians = angle * Math.PI / 180;
        var cosB = Math.cos(radians);
        var sinB = Math.sin(radians);

        var rotationMatrix = new Float32Array([
            cosB,  sinB, 0.0, 0.0,
            -sinB, cosB, 0.0, 0.0,
            0.0,   0.0,  1.0, 0.0,
            0.0,   0.0,  0.0, 1.0
        ]);

        // Set the rotation matrix uniform
        gl.uniformMatrix4fv(uRotationMatrix, false, rotationMatrix);

        // Draw the square
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Increment the angle for the next frame
        angle += 1;

        // Request another frame
        requestAnimationFrame(render);
    }

    // Start the rendering loop
    render();
}
