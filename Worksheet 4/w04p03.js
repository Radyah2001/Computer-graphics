var gl;
var program;
var points = [];
var normals = [];
var colors = [];
var subdivisionLevel = 3;
var angle = 0;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create buttons
    createButtons();

    // Initial sphere creation
    createSphere();

    // Start animation
    animate();
}

function createButtons() {
    var increaseButton = document.createElement("button");
    increaseButton.textContent = "Increase Subdivision";
    increaseButton.onclick = function() {
        subdivisionLevel++;
        createSphere();
        render();
    };
    document.body.appendChild(increaseButton);

    var decreaseButton = document.createElement("button");
    decreaseButton.textContent = "Decrease Subdivision";
    decreaseButton.onclick = function() {
        if (subdivisionLevel > 0) {
            subdivisionLevel--;
            createSphere();
            render();
        }
    };
    document.body.appendChild(decreaseButton);
}

function createSphere() {
    points = [];
    normals = [];
    colors = [];
    tetrahedron(vec3(0, 0, -1), vec3(0, 0.942809, 0.333333),
                vec3(-0.816497, -0.471405, 0.333333), vec3(0.816497, -0.471405, 0.333333),
                subdivisionLevel);

    // Create and bind vertex buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create and bind normal buffer
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Create and bind color buffer
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Set light direction uniform
    var lightDirection = gl.getUniformLocation(program, "uLightDirection");
    gl.uniform3fv(lightDirection, [0, 0, -1]);
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = normalize(mix(a, b, 0.5));
        var ac = normalize(mix(a, c, 0.5));
        var bc = normalize(mix(b, c, 0.5));

        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    }
    else {
        triangle(a, b, c);
    }
}

function triangle(a, b, c) {
    points.push(a);
    points.push(b);
    points.push(c);
    
    // Use vertex positions as normals (since it's a unit sphere)
    normals.push(a);
    normals.push(b);
    normals.push(c);
    
    // Calculate colors based on vertex positions (diffuse reflection coefficient)
    colors.push(vec3(0.5 * a[0] + 0.5, 0.5 * a[1] + 0.5, 0.5 * a[2] + 0.5));
    colors.push(vec3(0.5 * b[0] + 0.5, 0.5 * b[1] + 0.5, 0.5 * b[2] + 0.5));
    colors.push(vec3(0.5 * c[0] + 0.5, 0.5 * c[1] + 0.5, 0.5 * c[2] + 0.5));
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var radius = 5.0;
    var eye = vec3(radius * Math.sin(angle), 0, radius * Math.cos(angle));
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);

    var modelViewMatrix = lookAt(eye, at, up);
    var projectionMatrix = perspective(45, 1, 0.1, 100);
    var modelViewProjectionMatrix = mult(projectionMatrix, modelViewMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewProjectionMatrix"), false, flatten(modelViewProjectionMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(modelViewMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

function animate() {
    angle += 0.01;
    render();
    requestAnimationFrame(animate);
}