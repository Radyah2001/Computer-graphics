var gl;
var program;
var points = [];
var normals = [];
var subdivisionLevel = 3;
var angle = 0;

// Material and light parameters
var kd = 0.7;
var ks = 0.3;
var shininess = 10.0;
var Le = 1.0;
var La = 0.2;

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

    // Create buttons and sliders
    createButtons();
    createSliders();

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

function createSliders() {
    createSlider("kd", 0, 1, 0.01, kd, function(value) {
        kd = parseFloat(value);
        gl.uniform1f(gl.getUniformLocation(program, "uKd"), kd);
    });
    createSlider("ks", 0, 1, 0.01, ks, function(value) {
        ks = parseFloat(value);
        gl.uniform1f(gl.getUniformLocation(program, "uKs"), ks);
    });
    createSlider("shininess", 1, 100, 1, shininess, function(value) {
        shininess = parseFloat(value);
        gl.uniform1f(gl.getUniformLocation(program, "uShininess"), shininess);
    });
    createSlider("Le", 0, 2, 0.01, Le, function(value) {
        Le = parseFloat(value);
        gl.uniform1f(gl.getUniformLocation(program, "uLe"), Le);
    });
    createSlider("La", 0, 1, 0.01, La, function(value) {
        La = parseFloat(value);
        gl.uniform1f(gl.getUniformLocation(program, "uLa"), La);
    });
}

function createSlider(name, min, max, step, initialValue, onChange) {
    var label = document.createElement("label");
    label.textContent = name + ": ";
    var slider = document.createElement("input");
    slider.type = "range";
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = initialValue;
    slider.oninput = function() {
        onChange(this.value);
    };
    label.appendChild(slider);
    document.body.appendChild(label);
}

function createSphere() {
    points = [];
    normals = [];
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

    // Set light direction uniform
    var lightDirection = gl.getUniformLocation(program, "uLightDirection");
    gl.uniform3fv(lightDirection, [0, 0, -1]);

    // Set initial uniform values
    gl.uniform1f(gl.getUniformLocation(program, "uKd"), kd);
    gl.uniform1f(gl.getUniformLocation(program, "uKs"), ks);
    gl.uniform1f(gl.getUniformLocation(program, "uShininess"), shininess);
    gl.uniform1f(gl.getUniformLocation(program, "uLe"), Le);
    gl.uniform1f(gl.getUniformLocation(program, "uLa"), La);
    gl.uniform3f(gl.getUniformLocation(program, "uSphereColor"), 0.7, 0.7, 1.0); // Light blue color for the sphere
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