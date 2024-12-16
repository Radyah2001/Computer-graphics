// ------------------ Global Variables ------------------

// WebGL and program objects
var gl;
var program;
var canvas;
var instancedArrays;  // Extension for instanced rendering
var vertexBuffer;

// Scene configuration
var subDivLevel = 7;
var orbiting = true;
var prevTimeStamp = 0;
var theta = 0;
const dist = 3;

// Initial geometry definition
const initialTetrahedron = [
    vec3(0.0, 0.0, 1.0),
    vec3(0.0, 0.942809, -0.333333),
    vec3(-0.816497, -0.471405, -0.333333),
    vec3(0.816497, -0.471405, -0.333333),
];

// Generate sphere vertices
var vertices = sphere(initialTetrahedron, subDivLevel);
var nVertices = vertices.length;

// Projection matrix
const P = perspective(90, 1, 1, 50);
var Vloc;

// Model matrix for a single instance
const M = flatten(translate(0.0, 0.0, 0.0));

// ------------------ Utility Functions ------------------

function loadExtension(name) {
    var ext = gl.getExtension(name);
    if (!ext) {
        console.log('Warning: Unable to use extension:', name);
    }
    return ext;
}

function setUpAttribute(data, attribute, size, divisor=0, mode=gl.STATIC_DRAW) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, mode);

    const loc = gl.getAttribLocation(program, attribute);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
    
    instancedArrays.vertexAttribDivisorANGLE(loc, divisor);
    buffer.loc = loc;
    return buffer;
}

function setUpMatrixAttribute(data, attribute, size, divisor=0, mode=gl.STATIC_DRAW) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, mode);

    const loc = gl.getAttribLocation(program, attribute);
    const bytesPerMatrix = size * size * 4; // size x size floats, 4 bytes/float
    for (let i = 0; i < size; i++) {
        const rowLoc = loc + i;
        gl.enableVertexAttribArray(rowLoc);
        const offset = i * size * 4;
        gl.vertexAttribPointer(rowLoc, size, gl.FLOAT, false, bytesPerMatrix, offset);
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

    // Subdivide each face of the tetrahedron
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

// ------------------ Rendering Functions ------------------

function render(timeStamp) {
    // Clear the screen
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // If orbiting, update camera angle
    if (orbiting) {
        theta += (timeStamp - prevTimeStamp) / 5000;
        const eye = vec3(dist * Math.cos(theta), 0.0, dist * Math.sin(theta));
        const V = lookAt(eye, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
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
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert("WebGL isn't available!");
        return;
    }

    // Enable extensions
    loadExtension('OES_element_index_uint');       // U32 index buffer support
    instancedArrays = loadExtension('ANGLE_instanced_arrays'); // Instanced rendering

    // Set up rendering state
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
}

function initShadersAndPrograms() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Set up uniforms
    const Ploc = gl.getUniformLocation(program, "P");
    gl.uniformMatrix4fv(Ploc, false, flatten(P));

    Vloc = gl.getUniformLocation(program, "V");
}

function initBuffers() {
    vertexBuffer = setUpAttribute(flatten(vertices), "position", 3);
    setUpMatrixAttribute(new Float32Array(M), "M", 4, 1);
    updateVertexBuffer();
}

function initTextures() {
    // Create a cube map texture and fill it with a placeholder
    const cubeMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
    gl.activeTexture(gl.TEXTURE0);

    // One-pixel placeholder colors
    const red     = new Uint8Array([255, 0,   0, 255]);
    const green   = new Uint8Array([0, 255,   0, 255]);
    const blue    = new Uint8Array([0, 0,   255, 255]);
    const cyan    = new Uint8Array([0, 255, 255, 255]);
    const magenta = new Uint8Array([255, 0, 255, 255]);
    const yellow  = new Uint8Array([255, 255, 0, 255]);

    // Assign a single-pixel texture to each face initially
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X ,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, red);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X ,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, green);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y ,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, blue);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y ,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, cyan);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z ,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, yellow);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z ,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE, magenta);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 0);

    // Load actual cube map textures
    const textures = [
        ['textures/cm_left.png',   gl.TEXTURE_CUBE_MAP_POSITIVE_X],
        ['textures/cm_right.png',  gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
        ['textures/cm_top.png',    gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
        ['textures/cm_bottom.png', gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
        ['textures/cm_back.png',   gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
        ['textures/cm_front.png',  gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
    ];

    textures.forEach(([filename, cubeface]) => {
        const image = document.createElement('img');
        image.crossOrigin = 'anonymous';
        image.onload = function(event) {
            gl.texImage2D(cubeface, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, event.target);
        };
        image.src = filename;
    });
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
    initTextures();
    initEventListeners();

    // Start animation loop
    requestAnimationFrame(animate);
};
