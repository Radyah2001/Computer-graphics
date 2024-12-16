// ------------------ Global Variables ------------------

var gl;
var program;
var canvas;

// Vertex counts for shapes
const nGroundVertices = 6;
const nVertices = 12;

// Geometry data for ground and quads
var groundVertices = new Float32Array(flatten([
    vec3(-2.0, -1.0, -1.0),
    vec3(2.0, -1.0, -1.0),
    vec3(2.0, -1.0, -5.0),
    vec3(-2.0, -1.0, -5.0),
    vec3(-2.0, -1.0, -1.0),
    vec3(2.0, -1.0, -5.0),
]));

const groundTextureCoords = new Float32Array(flatten([
    vec2(0.0, 0.0),
    vec2(1.0, 0.0),
    vec2(1.0, 1.0),
    vec2(0.0, 1.0),
    vec2(0.0, 0.0),
    vec2(1.0, 1.0),
]));

const vertices = new Float32Array(flatten([
    // ground parallel quad
    vec3(0.25, -0.5, -1.25),
    vec3(0.75, -0.5, -1.25),
    vec3(0.75, -0.5, -1.75),
    vec3(0.25, -0.5, -1.75),
    vec3(0.25, -0.5, -1.25),
    vec3(0.75, -0.5, -1.75),
    // upright quad
    vec3(-1.0, -1.0, -2.5),
    vec3(-1.0, 0.0, -2.5),
    vec3(-1.0, 0.0, -3.0),
    vec3(-1.0, -1.0, -3.0),
    vec3(-1.0, -1.0, -2.5),
    vec3(-1.0, 0.0, -3.0),
]));

const textureCoords = new Float32Array(flatten([
    vec2(0.0, 0.0),
    vec2(1.0, 0.0),
    vec2(1.0, 1.0),
    vec2(0.0, 1.0),
    vec2(0.0, 0.0),
    vec2(1.0, 1.0),
    vec2(0.0, 0.0),
    vec2(1.0, 0.0),
    vec2(1.0, 1.0),
    vec2(0.0, 1.0),
    vec2(0.0, 0.0),
    vec2(1.0, 1.0),
]));

// Projection and View matrices
const P = perspective(45, 1, 1, 50);
const V = lookAt(vec3(0.0, 1.0, 2.0), vec3(0.0, 0.0, -3.2), vec3(0.0, 1.0, 0.0));
const Ms = mat4(); // Model matrix for shadows or objects
const I = mat4();  // Identity matrix

// Animation parameters
var theta = 0;
var prevTimeStamp = 0;

// ------------------ Initialization Functions ------------------

function initWebGL() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert("WebGL isn't available!");
        return;
    }

    // Enable required extensions
    const ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
      console.log('Warning: Unable to use OES_element_index_uint extension');
    }

    // Configure viewport and clear color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0); // Cornflower blue
}

function initShadersAndProgram() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Set up uniforms
    program.P = gl.getUniformLocation(program, "P");
    gl.uniformMatrix4fv(program.P, false, flatten(P));

    program.V = gl.getUniformLocation(program, "V");
    gl.uniformMatrix4fv(program.V, false, flatten(V));

    program.M = gl.getUniformLocation(program, "M");
}

function initBuffers() {
    // Vertex position buffer
    program.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    program.vertexBuffer.loc = gl.getAttribLocation(program, "vertexPosition");
    gl.vertexAttribPointer(program.vertexBuffer.loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.vertexBuffer.loc);

    // Vertex texture coordinate buffer
    program.vertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexTextureCoordBuffer);
    program.vertexTextureCoordBuffer.loc = gl.getAttribLocation(program, "vertexTextureCoord");
    gl.vertexAttribPointer(program.vertexTextureCoordBuffer.loc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.vertexTextureCoordBuffer.loc);
}

function initTextures() {
    // Create a simple red texture for demonstration
    const redTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, redTexture);

    const redPixel = new Uint8Array([255, 0, 0, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, redPixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    // Load ground texture
    var image = document.createElement('img');
    image.crossOrigin = 'anonymous';
    image.onload = function () {
        const groundTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    };
    image.src = 'xamp23.png';
}

// ------------------ Rendering Functions ------------------

function render(timeStamp) {
    // Clear screen (color buffer only, no depth buffer needed as it isn't enabled)
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update animation parameters
    theta += (timeStamp - prevTimeStamp) / 2000;
    prevTimeStamp = timeStamp;

    let lightPos = vec3(0.0, 2.0 + 2 * Math.cos(theta), -2 + 2 * Math.sin(theta));
    // Light position is calculated but not currently used.  
    // Consider adding a uniform for lightPos if needed.

    // ---- Draw Ground ----
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundTextureCoords, gl.STATIC_DRAW);

    // Set model matrix to identity for the ground
    gl.uniformMatrix4fv(program.M, false, flatten(I));

    // Use texture unit 0 for the ground
    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 0);

    // Draw ground
    gl.drawArrays(gl.TRIANGLES, 0, nGroundVertices);

    // ---- Draw Shadows ----
    // Here we assume shadows are represented by the red texture
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.STATIC_DRAW);

    // Use Ms as the model matrix for shadows if needed
    gl.uniformMatrix4fv(program.M, false, flatten(Ms));

    // Use texture unit 1 (red texture) for shadows
    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 1);
    gl.drawArrays(gl.TRIANGLES, 0, nVertices);

    // ---- Draw Objects ----
    // Reusing the same vertices/texture coords, so just set up model matrix and draw again
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.STATIC_DRAW);

    // Model matrix is identity for objects
    gl.uniformMatrix4fv(program.M, false, flatten(I));

    // Use the same red texture for the objects, or switch back to ground if desired
    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 1);
    gl.drawArrays(gl.TRIANGLES, 0, nVertices);
}

function animate(timeStamp) {
    render(timeStamp);
    requestAnimationFrame(animate);
}

// ------------------ Entry Point ------------------

window.onload = function init() {
    initWebGL();
    initShadersAndProgram();
    initBuffers();
    initTextures();

    // Start the animation loop
    animate();
};
