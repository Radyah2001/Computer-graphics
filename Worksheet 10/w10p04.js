// ------------------ Global Variables ------------------
var points    = [];
var colors    = [];
var normals   = [];
var texCoords = [];

var numSubdivisions = 6;
var index = 0;

var colorAdd    = vec4(1.0, 0.5, 0.5, 0.0);
var texCoordAdd = vec2(0.5, 0.5);

// Camera and manipulation variables
var xPan = 0.0;
var yPan = 0.0;
var diff = 0.0;

// Interaction modes
var rotMode   = true;
var dollyMode = false;
var panMode   = false;

// Initial camera settings
var eye0 = vec3(0.0, 0.0, -5.0);
var at0  = vec3(0.0, 0.0, 0.0);
var up0  = vec3(0.0, 1.0, 0.0);
var x0   = vec3(1.0, 0.0, 0.0);
var y0   = vec3(0.0, 1.0, 0.0);

// Current camera parameters
var eye = vec3(0, 0, -5);
var at  = vec3(0, 0, 0);
var up  = vec3(0.0, 1.0, 0.0);

// Quaternion for rotation
var q_rot = new Quaternion();
var q_inc = new Quaternion();
var last_qinc = q_inc;

// Timing variables for resetting quaternion increment
var startTime, endTime;
var timeDiff;

// ------------------ Initialization Functions ------------------

function initWebGL() {
    var canvas = document.getElementById("gl-canvas");
    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available!");
        return null;
    }

    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);

    return {gl: gl, canvas: canvas};
}

function initShadersAndProgram(gl) {
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program); 
    return program;
}

function setUpLighting(gl, program) {
    var lightPosition = vec4(0.0, 0.0, 1.0, 0.0);
    var lightPosLoc = gl.getUniformLocation(program, "lightPosition");
    gl.uniform4fv(lightPosLoc, flatten(lightPosition));

    var lightDirLoc = gl.getUniformLocation(program, "lightDir");
    gl.uniform3fv(lightDirLoc, [1.0, 1.0, 1.0]);
}

function setUpMatrices(gl, program) {
    // View matrix
    var V = lookAt(eye, at, up);
    var VLoc = gl.getUniformLocation(program, "V");
    gl.uniformMatrix4fv(VLoc, false, flatten(V));

    // Projection matrix
    var P = perspective(45, 1, 0.1, 10.0);
    var PLoc = gl.getUniformLocation(program, "P");
    gl.uniformMatrix4fv(PLoc, false, flatten(P));

    // Model matrix
    var M1 = mat4();
    var MLoc = gl.getUniformLocation(program, "M");
    gl.uniformMatrix4fv(MLoc, false, flatten(M1));

    return {V: V, VLoc: VLoc, P: P, PLoc: PLoc, M1: M1, MLoc: MLoc};
}

function initGeometry() {
    // Create subdivided tetrahedron approximating a sphere
    var va = vec4(0.0, 0.0, -1.0, 1);
    var vb = vec4(0.0, 0.942809, 0.333333, 1);
    var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
    var vd = vec4(0.816497, -0.471405, 0.333333, 1);
    tetrahedron(numSubdivisions, va, vb, vc, vd);

    // Compute texture coordinates
    updateTexCoords();
}

function initTextures(gl, program) {
    // Create a simple red texture
    var red_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, red_texture);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE,
        new Uint8Array([255, 0, 0])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.activeTexture(gl.TEXTURE0); 
    gl.bindTexture(gl.TEXTURE_2D, red_texture);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

function initBuffers(gl, program) {
    // Texture coordinates buffer
    var tBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer); 
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW); 
    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    // Normals buffer
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Vertex positions buffer
    var vBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer); 
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW); 
    var vPosition = gl.getAttribLocation(program, "vPosition"); 
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0); 
    gl.enableVertexAttribArray(vPosition);
}

function initModeButtons() {
    var rotButton = document.getElementById("rot");
    var dollyButton = document.getElementById("dolly");
    var panButton = document.getElementById("pan");

    rotButton.addEventListener("click", function() { 
        rotMode = true;
        dollyMode = false;
        panMode = false;
    });

    dollyButton.addEventListener("click", function() { 
        rotMode = false;
        dollyMode = true;
        panMode = false;
    });

    panButton.addEventListener("click", function() { 
        rotMode = false;
        dollyMode = false;
        panMode = true;
    });
}

// ------------------ Update and Render Functions ------------------

function updateViewMatrix(gl, program) {
    if (rotMode) {
        up = vec3(q_rot.apply(up0));
        eye = add(vec3(q_rot.apply(eye0)), at);
        at = add(at, scale(-1.0, add(scale(xPan, vec3(q_rot.apply(x0))), scale(yPan, vec3(q_rot.apply(y0))))));
    } else if (dollyMode) {
        // Dolly in/out by adjusting eye0[2]
        if (eye0[2] + diff >= 0) {
            eye0[2] = 0;
        } else {
            eye0[2] += diff;
            diff = 0;
        }
        up = vec3(q_rot.apply(up0));
        eye = add(vec3(q_rot.apply(eye0)), at);
        at = add(at, scale(-1.0, add(scale(xPan, vec3(q_rot.apply(x0))), scale(yPan, vec3(q_rot.apply(y0))))));
    } else if (panMode) {
        up = vec3(q_rot.apply(up0));
        at = add(at, scale(-1.0, add(scale(xPan, vec3(q_rot.apply(x0))), scale(yPan, vec3(q_rot.apply(y0))))));
        eye = add(vec3(q_rot.apply(eye0)), at);
        xPan = 0; 
        yPan = 0;
    }

    var V = lookAt(eye, at, up);
    var VLoc = gl.getUniformLocation(program, "V");
    gl.uniformMatrix4fv(VLoc, false, flatten(V));
}

function render(gl, program) {
    function frame() {
        end();
        // If more than 10 seconds have passed, reset last_qinc
        if (timeDiff >= 10000){
            last_qinc.setIdentity();
            start();
        }
        q_rot = q_rot.multiply(last_qinc);

        updateViewMatrix(gl, program);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, points.length);

        requestAnimationFrame(frame);
    }
    frame();
}

// ------------------ Event Handling Functions ------------------

function initEventHandlers(canvas, qrot, qinc) {
    var dragging = false;
    var lastX = -1, lastY = -1;

    canvas.onmousedown = function(ev) {
        var x = ev.clientX, y = ev.clientY;
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastX = x; lastY = y;
            dragging = true;
        }
    };

    canvas.onmouseup = function() {
        qinc.setIdentity();
        dragging = false;
    };

    canvas.onmousemove = function(ev) {
        var x = ev.clientX, y = ev.clientY;
        if (dragging) {
            var rect = ev.target.getBoundingClientRect();
            var s_x = ((x - rect.left) / rect.width - 0.5) * 2;
            var s_y = (0.5 - (y - rect.top) / rect.height) * 2;
            var s_last_x = ((lastX - rect.left) / rect.width - 0.5) * 2;
            var s_last_y = (0.5 - (lastY - rect.top) / rect.height) * 2;

            if (rotMode) {
                var v1 = vec3(s_x, s_y, project_to_sphere(s_x, s_y));
                var v2 = vec3(s_last_x, s_last_y, project_to_sphere(s_last_x, s_last_y));
                qinc = qinc.make_rot_vec2vec(normalize(v1), normalize(v2));
                qrot = qrot.multiply(qinc);
                last_qinc = qinc;
            } else if (dollyMode) {
                diff = 2*(s_y - s_last_y);
            } else if (panMode) {
                xPan = 2.0*(s_x - s_last_x);
                yPan = 0.5*(s_y - s_last_y);
            }
        }
        lastX = x; lastY = y;
    };
}

// ------------------ Timing Functions ------------------

function start() {
    startTime = new Date();
}

function end() {
    endTime = new Date();
    timeDiff = endTime - startTime; // in milliseconds
}

// ------------------ Geometry Functions ------------------

function triangle(a, b, c) {
    points.push(a, b, c);
    colors.push(colorAdd, colorAdd, colorAdd);

    normals.push(a[0], a[1], a[2]);
    normals.push(b[0], b[1], b[2]);
    normals.push(c[0], c[1], c[2]);

    index += 3;
}

function divideTriangle(a, b, c, count) {
    if (count === 0) {
        triangle(a, b, c);
    } else {
        var ab = normalize(mix(a, b, 0.5), true);
        var ac = normalize(mix(a, c, 0.5), true);
        var bc = normalize(mix(b, c, 0.5), true);

        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    }
}

function tetrahedron(count, a, b, c, d) {
    divideTriangle(a, b, c, count);
    divideTriangle(d, c, b, count);
    divideTriangle(a, d, b, count);
    divideTriangle(a, c, d, count);
}

function updateTexCoords() {
    for (let i = 0; i < points.length; i++) {
        var normal = normalize(points[i].slice(0,3));
        var u = 0.5 + Math.atan2(normal[0], normal[2]) / (2 * Math.PI);
        var v = 0.5 - Math.asin(normal[1]) / Math.PI;
        texCoords.push(vec2(u, v));
    }
}

function project_to_sphere(x, y) {
    var r = 2;
    var d = Math.sqrt(x * x + y * y);
    var t = r * Math.sqrt(2);
    var z;

    if (d < r) {
        z = Math.sqrt(r*r - d*d);
    } else if (d < t) {
        z = 0;
    } else {
        z = t*t/d;
    }
    return z;
}

// ------------------ Entry Point ------------------

window.onload = function init() {
    var context = initWebGL();
    if (!context) return;
    var gl = context.gl;
    var canvas = context.canvas;

    var program = initShadersAndProgram(gl);
    setUpLighting(gl, program);
    setUpMatrices(gl, program);
    initGeometry();
    initTextures(gl, program);
    initBuffers(gl, program);
    initModeButtons();
    initEventHandlers(canvas, q_rot, q_inc);

    start(); // start timing
    render(gl, program);
};
