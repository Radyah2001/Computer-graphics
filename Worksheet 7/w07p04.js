// ------------------ Global Variables ------------------

// WebGL and program objects
var gl;
var program;
var canvas;
var vertexBuffer;

// Scene parameters
var subDivLevel = 6;
var reflectiveMask = true;
var orbiting = true;
var prevTimeStamp = 0;
var theta = 0;
const dist = 3;

// Geometry setup for sphere
const initialTetrahedron = [
    vec3(0.0, 0.0, 1.0),
    vec3(0.0, 0.942809, -0.333333),
    vec3(-0.816497, -0.471405, -0.333333),
    vec3(0.816497, -0.471405, -0.333333),
];
var sphereVertices = sphere(initialTetrahedron, subDivLevel);
var nVertices = sphereVertices.length;
var vertices = new Float32Array(flatten(sphereVertices));

// Projection and inverse projection matrices
const P = new Float32Array(flatten(perspective(90, 1, 1, 50)));
const PInv = inverse(perspective(90, 1, 1, 50));

// Identity matrix
const I = new Float32Array(flatten(mat4()));

// Background quad vertices
const bgVertices = new Float32Array(flatten([
    vec3(1.0, -1.0, 0.99),
    vec3(1.0, 1.0, 0.99),
    vec3(-1.0, -1.0, 0.99),
    vec3(-1.0, -1.0, 0.99),
    vec3(1.0, 1.0, 0.99),
    vec3(-1.0, 1.0, 0.99),
]));

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

    // Generate the subdivided sphere
    divideTriangle(a, b, c, nSubdivisions);
    divideTriangle(d, c, b, nSubdivisions);
    divideTriangle(a, d, b, nSubdivisions);
    divideTriangle(a, c, d, nSubdivisions);

    return vertices;
}

// ------------------ Utility Functions ------------------

function loadExtension(name) {
    var ext = gl.getExtension(name);
    if (!ext) {
        console.log('Warning: Unable to use extension:', name);
    }
    return ext;
}

function setUpAttribute(data, attribute, size, divisor=0, mode=gl.STATIC_DRAW) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, mode);

    var loc = gl.getAttribLocation(program, attribute);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);

    buffer.loc = loc;
    return buffer;
}

// ------------------ Texture Initialization ------------------

function initCubeMap() {
    // One-pixel placeholders for each cube face
    var red     = new Uint8Array([255, 0,   0,   255]);
    var green   = new Uint8Array([0,   255, 0,   255]);
    var blue    = new Uint8Array([0,   0,   255, 255]);
    var cyan    = new Uint8Array([0,   255, 255, 255]);
    var magenta = new Uint8Array([255, 0,   255, 255]);
    var yellow  = new Uint8Array([255, 255, 0,   255]);

    var cubeMap = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

    // Assign placeholders to each face
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, green);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blue);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, cyan);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, yellow);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, magenta);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Load actual cube map textures
    var textures = [
        ['textures/cm_left.png',    gl.TEXTURE_CUBE_MAP_POSITIVE_X],
        ['textures/cm_right.png',   gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
        ['textures/cm_top.png',     gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
        ['textures/cm_bottom.png',  gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
        ['textures/cm_back.png',    gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
        ['textures/cm_front.png',   gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
    ];

    textures.forEach(([filename, cubeface]) => {
        var image = document.createElement('img');
        image.crossOrigin = 'anonymous';
        image.onload = function(event) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
            gl.texImage2D(cubeface, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, event.target);
        };
        image.src = filename;
    });

    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 0);
}

function initNormalMap() {
    var normalMap = gl.createTexture();
    var image = document.createElement('img');
    image.crossOrigin = 'anonymous';
    image.onload = function(event) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normalMap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, event.target);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    };
    image.src = "textures/normalmap.png";

    gl.uniform1i(gl.getUniformLocation(program, "normalMap"), 1);
}

// ------------------ Rendering and Animation ------------------

function render(timeStamp) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update orbit angle if orbiting
    if (orbiting) {
        theta += (timeStamp - prevTimeStamp) / 5000;
    }
    prevTimeStamp = timeStamp;

    let eyePos = vec3(dist * Math.cos(theta), 0.0, dist * Math.sin(theta));
    let V = lookAt(eyePos, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));

    // Draw sphere
    gl.uniform1i(program.reflective, reflectiveMask & true);
    gl.uniform3fv(program.eyePos, eyePos);
    gl.uniformMatrix4fv(program.P, false, P);
    gl.uniformMatrix4fv(program.V, false, flatten(V));
    gl.uniformMatrix4fv(program.MTex, false, I);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, nVertices);

    // Draw background
    gl.uniform1i(program.reflective, false);
    gl.uniformMatrix4fv(program.P, false, I);
    gl.uniformMatrix4fv(program.V, false, I);

    let VInv = inverse(V);
    let VInvRot = mat4(
        [VInv[0][0], VInv[0][1], VInv[0][2], 0.0],
        [VInv[1][0], VInv[1][1], VInv[1][2], 0.0],
        [VInv[2][0], VInv[2][1], VInv[2][2], 0.0],
        [0.0,         0.0,        0.0,       0.0]
    );

    let MTex = flatten(mult(VInvRot, PInv));
    gl.uniformMatrix4fv(program.MTex, false, MTex);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, bgVertices, gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function animate(timeStamp) {
    render(timeStamp);
    requestAnimationFrame(animate);
}

// ------------------ Initialization ------------------

function initWebGL() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available!");
        return;
    }

    // Enable extensions
    loadExtension('OES_element_index_uint');

    // Enable depth testing and back-face culling
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // Set viewport and clear color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
}

function initShadersAndProgram() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Store uniform locations in program object
    program.P = gl.getUniformLocation(program, "P");
    program.V = gl.getUniformLocation(program, "V");
    program.MTex = gl.getUniformLocation(program, "MTex");
    program.reflective = gl.getUniformLocation(program, "reflective");
    program.eyePos = gl.getUniformLocation(program, "eyePos");
}

function initAttributes() {
    vertexBuffer = setUpAttribute(vertices, "position", 3);
}

function initEventListeners() {
    document.getElementById("toggleOrbit").addEventListener("click", () => {
        orbiting = !orbiting;
    });

    document.getElementById("toggleReflective").addEventListener("click", () => {
        reflectiveMask = !reflectiveMask;
    });
}

// ------------------ Entry Point ------------------

window.onload = function init() {
    initWebGL();
    initShadersAndProgram();
    initAttributes();
    initCubeMap();
    initNormalMap();
    initEventListeners();

    requestAnimationFrame(animate);
};
