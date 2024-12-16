var gl;
var program;
var vertices;
var indices;
var vBuffer;
var iBuffer;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create cube vertices
    vertices = [
        vec4(0, 0, 0, 1), vec4(1, 0, 0, 1), vec4(1, 1, 0, 1), vec4(0, 1, 0, 1),
        vec4(0, 0, 1, 1), vec4(1, 0, 1, 1), vec4(1, 1, 1, 1), vec4(0, 1, 1, 1)
    ];

    // Create cube indices for lines
    indices = [
        0, 1, 1, 2, 2, 3, 3, 0,
        4, 5, 5, 6, 6, 7, 7, 4,
        0, 4, 1, 5, 2, 6, 3, 7
    ];

    // Create and bind vertex buffer
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Create and bind index buffer
    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Associate shader variables with data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Define the translation
    var translation = translate(0.5, -0.8, 0.5);  // Move the cube 0.5 units in each direction

    // Part 1: Isometric View with translation
    var isometricMatrix = mult(
        mult(rotateX(35.264), rotateY(45)),
        translation
    );
    drawCube(isometricMatrix, false);
}

function drawCube(matrix, useProjection) {
    var finalMatrix = useProjection ? matrix : ortho(-1.5, 1.5, -1.5, 1.5, -10, 10);
    if (!useProjection) {
        finalMatrix = mult(finalMatrix, matrix);
    }
    
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uFinalMatrix"), false, flatten(finalMatrix));
    gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
}