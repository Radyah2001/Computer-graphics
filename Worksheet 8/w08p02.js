// ------------------ Global Variables ------------------

var gl;
var program;
var canvas;

// Geometry data
const groundVertices = new Float32Array(flatten([
    // Ground (two triangles forming a rectangle)
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
const nGroundVertices = 6;

const vertices = new Float32Array(flatten([
    // Ground parallel quad
    vec3(0.25, -0.5, -1.25),
    vec3(0.75, -0.5, -1.25),
    vec3(0.75, -0.5, -1.75),
    vec3(0.25, -0.5, -1.75),
    vec3(0.25, -0.5, -1.25),
    vec3(0.75, -0.5, -1.75),

    // Upright quad
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
const nVertices = 12;

// Projection and view matrices
const P = perspective(45, 1, 1, 50);
const V = lookAt(vec3(0.0, 1.0, 2.0), vec3(0.0, 0.0, -3.2), vec3(0.0, 1.0, 0.0));

// Shadow projection matrix component (Mp)
const Mp = mat4();
Mp[0][0] = 1.0;
Mp[1][1] = 1.0;
Mp[2][2] = 1.0;
Mp[3][3] = 0.0;
Mp[3][1] = 1.0 / (-1 - 2); // (y_ground - y_light)

// Identity matrix
const I = mat4();

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

    // Enable extension for U32 indices if needed
    var ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
        console.log('Warning: Unable to use OES_element_index_uint extension');
    }

    // Set viewport and background color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0); // Cornflower blue
}

function initShadersAndProgram() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
}

function initBuffers() {
    // Vertex buffer
    program.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    program.vertexBuffer.loc = gl.getAttribLocation(program, "vertexPosition");
    gl.vertexAttribPointer(program.vertexBuffer.loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.vertexBuffer.loc);

    // Texture coordinate buffer
    program.vertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexTextureCoordBuffer);
    program.vertexTextureCoordBuffer.loc = gl.getAttribLocation(program, "vertexTextureCoord");
    gl.vertexAttribPointer(program.vertexTextureCoordBuffer.loc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.vertexTextureCoordBuffer.loc);
}

function initMatrices() {
    // Send projection and view matrices to shader
    program.P = gl.getUniformLocation(program, "P");
    gl.uniformMatrix4fv(program.P, false, flatten(P));

    program.V = gl.getUniformLocation(program, "V");
    gl.uniformMatrix4fv(program.V, false, flatten(V));

    program.M = gl.getUniformLocation(program, "M");
}

function initTextures() {
    // Red texture for objects/shadows
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
        var groundTexture = gl.createTexture();
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

function initEventListeners() {
    // Currently no event listeners are needed,
    // but this function is here for easy future expansions.
}

// ------------------ Rendering and Animation ------------------

function render(timeStamp) {
    // Clear the color buffer
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update theta for animation
    let diff = (timeStamp - prevTimeStamp) / 2000;
    if (diff) {
        theta += diff;
    }

    // Calculate light position for shadow projection
    let lightPos = vec3(2*Math.cos(theta), 2.0, -2.0 + 2*Math.sin(theta));
    let T_pl = translate(lightPos[0], lightPos[1], lightPos[2]);
    let T_neg_pl = translate(-lightPos[0], -lightPos[1], -lightPos[2]);
    let Ms = mult(T_pl, mult(Mp, T_neg_pl)); // Shadow matrix

    // ---- Draw Ground ----
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundTextureCoords, gl.STATIC_DRAW);

    gl.uniformMatrix4fv(program.M, false, flatten(I));
    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, nGroundVertices);

    // ---- Draw Shadows ----
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.STATIC_DRAW);

    gl.uniformMatrix4fv(program.M, false, flatten(Ms));
    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 1);
    gl.drawArrays(gl.TRIANGLES, 0, nVertices);

    // ---- Draw Objects ----
    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.STATIC_DRAW);

    gl.uniformMatrix4fv(program.M, false, flatten(I));
    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 1);
    gl.drawArrays(gl.TRIANGLES, 0, nVertices);

    prevTimeStamp = timeStamp;
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
    initMatrices();
    initTextures();
    initEventListeners();

    // Start animation loop
    animate();
};
