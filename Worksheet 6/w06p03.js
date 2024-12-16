// ------------------ Global Variables ------------------

// WebGL and program objects
var gl;
var program;
var canvas;

// WebGL extension objects
var instancedArrays;

// Buffers
var vertexBuffer;

// Configuration
var subDivLevel = 7;
var orbiting = true;
var prevTimeStamp = 0;
var theta = 0;
const dist = 5;

// Initial Tetrahedron for Sphere Generation
const initialTetrahedron = [
    vec3(0.0, 0.0, 1.0),
    vec3(0.0, 0.942809, -0.333333),
    vec3(-0.816497, -0.471405, -0.333333),
    vec3(0.816497, -0.471405, -0.333333),
];

// Vertices and Indices
var vertices = [];
var nVertices = 0;
const indices = new Uint32Array([]); // Not used directly for drawing arrays here, but shown for clarity

// Matrices
const P = perspective(45, 1, 1, 50);
var Vloc;
const M = new Float32Array([...flatten(translate(0.0, 0.0, 0.0))]);

// ------------------ Utility Functions ------------------

function loadExtension(name) {
    var ext = gl.getExtension(name);
    if (!ext) {
        console.log('Warning: Unable to use extension:', name);
    }
    return ext;
}

// Set up a generic attribute buffer
function setUpAttribute(data, attribute, size, divisor=0, mode=gl.STATIC_DRAW) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, mode);

    var loc = gl.getAttribLocation(program, attribute);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
    
    instancedArrays.vertexAttribDivisorANGLE(loc, divisor);

    buffer.loc = loc;
    return buffer;
}

// Set up a matrix attribute (e.g., Model matrix)
function setUpMatrixAttribute(data, attribute, size, divisor=0, mode=gl.STATIC_DRAW) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, mode);

    const loc = gl.getAttribLocation(program, attribute);
    const bytesPerMatrix = size * size * 4; // size x size floats, 4 bytes per float
    for (let i = 0; i < size; ++i) {
        const rowLoc = loc + i;
        gl.enableVertexAttribArray(rowLoc);
        const offset = i * size * 4;
        gl.vertexAttribPointer(
            rowLoc,
            size,
            gl.FLOAT,
            false,
            bytesPerMatrix,
            offset
        );
        instancedArrays.vertexAttribDivisorANGLE(rowLoc, divisor);
    }
    buffer.loc = loc;
    return buffer;
}

// ------------------ Geometry Functions ------------------

function sphere(initialTetrahedron, nSubdivisions) {
    var [a, b, c, d] = initialTetrahedron;
    var vertices = [];

    function divideTriangle(a, b, c, n) {
        if (n > 0) {
            var ab = normalize(mix(a, b, 0.5));
            var ac = normalize(mix(a, c, 0.5));
            var bc = normalize(mix(b, c, 0.5));

            divideTriangle(a, ab, ac, n - 1);
            divideTriangle(ab, b, bc, n - 1);
            divideTriangle(bc, c, ac, n - 1);
            divideTriangle(ab, bc, ac, n - 1);
        } else {
            vertices.push(a, b, c);
        }
    }

    divideTriangle(a, b, c, nSubdivisions);
    divideTriangle(d, c, b, nSubdivisions);
    divideTriangle(a, d, b, nSubdivisions);
    divideTriangle(a, c, d, nSubdivisions);

    return vertices;
}

function updateVertexBuffer() {
    vertices = sphere(initialTetrahedron, subDivLevel);
    nVertices = vertices.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
}

// ------------------ Render and Animation Functions ------------------

function render(timeStamp) {
    // Clear screen
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update camera if orbiting
    if (orbiting) {
        theta += (timeStamp - prevTimeStamp) / 5000;
        let V = lookAt(
            vec3(dist * Math.cos(theta), 0.0, dist * Math.sin(theta)), // eye
            vec3(0.0, 0.0, 0.0), // at
            vec3(0.0, 1.0, 0.0)  // up
        );
        gl.uniformMatrix4fv(Vloc, false, flatten(V));
    }

    prevTimeStamp = timeStamp;
    gl.drawArrays(gl.TRIANGLES, 0, nVertices);
}

function animate(timeStamp) {
    render(timeStamp);
    requestAnimationFrame(animate);
}

// ------------------ Initialization Functions ------------------

function initWebGL() {
    // Set up canvas and GL context
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert("WebGL isn't available!");
        return;
    }

    // Enable extensions
    loadExtension('OES_element_index_uint');
    instancedArrays = loadExtension('ANGLE_instanced_arrays');

    // Set viewport and state
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.01, 0.01, 0.01, 1.0);
}

function initShadersAndPrograms() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Set up uniform matrices
    var Ploc = gl.getUniformLocation(program, "P");
    gl.uniformMatrix4fv(Ploc, false, flatten(P));
    Vloc = gl.getUniformLocation(program, "V");
}

function initBuffers() {
    // Set up vertex attribute buffer
    vertexBuffer = setUpAttribute(flatten(sphere(initialTetrahedron, subDivLevel)), "position", 3);

    // Set up model matrix attribute
    setUpMatrixAttribute(M, "M", 4, 1);

    // Update vertex buffer (recomputing sphere based on subDivLevel if needed)
    updateVertexBuffer();
}

function initTexture() {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Single-pixel placeholder texture
    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel
    );

    // Load actual image
    var image = document.createElement('img');
    image.crossOrigin = 'anonymous';
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    };
    image.src = 'earth.jpg';

    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 0);
}

function initEventListeners() {
    document.getElementById("toggleOrbit").addEventListener("click", () => {
        orbiting = !orbiting;
    });
}

// ------------------ Entry Point ------------------

window.onload = function() {
    initWebGL();
    initShadersAndPrograms();
    initBuffers();
    initTexture();
    initEventListeners();
    requestAnimationFrame(animate);
};
