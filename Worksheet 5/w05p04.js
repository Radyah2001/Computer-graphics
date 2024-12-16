window.onload = async function init() {
    const canvas = document.getElementById("gl-canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    // Initialize shaders
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);

    // Set up projection and view matrices
    const projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100.0);
    const viewMatrix = lookAt(vec3(1.0, 1.0, 6.0), vec3(0.0, -1, 0.0), vec3(0.0, 1.0, 0.0));
    const modelMatrix = mat4();

    const u_Projection = gl.getUniformLocation(program, "u_Projection");
    const u_View = gl.getUniformLocation(program, "u_View");
    const u_Model = gl.getUniformLocation(program, "u_Model");

    gl.uniformMatrix4fv(u_Projection, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(u_View, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(u_Model, false, flatten(modelMatrix));

    // Light properties
    const u_LightDirection = gl.getUniformLocation(program, "u_LightDirection");
    const u_LightColor = gl.getUniformLocation(program, "u_LightColor");
    const u_AmbientLight = gl.getUniformLocation(program, "u_AmbientLight");
    const u_SpecularColor = gl.getUniformLocation(program, "u_SpecularColor");
    const u_Shininess = gl.getUniformLocation(program, "u_Shininess");
    const uKd = gl.getUniformLocation(program, "uKd");
    const uKs = gl.getUniformLocation(program, "uKs");
    const uLe = gl.getUniformLocation(program, "uLe");
    const uLa = gl.getUniformLocation(program, "uLa");

    gl.uniform3fv(u_LightDirection, flatten(vec3(1.0, 1.0, 1.0)));
    gl.uniform3fv(u_LightColor, flatten(vec3(1.0, 1.0, 1.0)));
    gl.uniform3fv(u_AmbientLight, flatten(vec3(0.2, 0.2, 0.2)));
    gl.uniform3fv(u_SpecularColor, flatten(vec3(1.0, 1.0, 1.0)));
    gl.uniform1f(u_Shininess, 32.0);

    gl.uniform1f(uKd, 0.7);
    gl.uniform1f(uKs, 0.3);
    gl.uniform1f(uLe, 1.0);
    gl.uniform1f(uLa, 0.2);

    function createSliders() {
        createSlider("kd", 0, 1, 0.01, 0.7, function(value) {
            gl.uniform1f(uKd, parseFloat(value));
            render();
        });
        createSlider("ks", 0, 1, 0.01, 0.3, function(value) {
            gl.uniform1f(uKs, parseFloat(value));
            render();
        });
        createSlider("shininess", 1, 100, 1, 32.0, function(value) {
            gl.uniform1f(u_Shininess, parseFloat(value));
            render();
        });
        createSlider("Le", 0, 2, 0.01, 1.0, function(value) {
            gl.uniform1f(uLe, parseFloat(value));
            render();
        });
        createSlider("La", 0, 1, 0.01, 0.2, function(value) {
            gl.uniform1f(uLa, parseFloat(value));
            render();
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

    createSliders();

    // Read and parse the OBJ file
    const objFileName = "suzanne.obj"; // Replace with your OBJ file
    const drawingInfo = await readOBJFile(objFileName, 1.0, true);

    if (!drawingInfo) {
        console.error("Failed to load OBJ file.");
        return;
    }

    // Check for required WebGL extension
    const ext = gl.getExtension("OES_element_index_uint");
    if (!ext) {
        console.error("Your browser does not support OES_element_index_uint.");
        return;
    }

    // Set up buffers
    const v_Buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, v_Buffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

    const n_Buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, n_Buffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

    const i_Buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, i_Buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    // Get attribute locations
    const a_Position = gl.getAttribLocation(program, "a_Position");
    const a_Normal = gl.getAttribLocation(program, "a_Normal");

    if (a_Position < 0 || a_Normal < 0) {
        console.error("Failed to get attribute locations");
        return;
    }

    // Bind vertex positions
    gl.bindBuffer(gl.ARRAY_BUFFER, v_Buffer);
    gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Bind vertex normals
    gl.bindBuffer(gl.ARRAY_BUFFER, n_Buffer);
    gl.vertexAttribPointer(a_Normal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    // Render the model
    function render() {
        gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
    }

    render();
};