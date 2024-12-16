window.onload = async function init() {
    // Get the WebGL context
    const canvas = document.getElementById("gl-canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        alert("WebGL isn't available.");
        return;
    }

    const ext = gl.getExtension("OES_element_index_uint");
    if (!ext) {
        console.error("OES_element_index_uint is not available.");
        return;
    }

    // Initialize shaders
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Enable depth testing for 3D rendering
    gl.enable(gl.DEPTH_TEST);

    // Set up projection and view matrices
    const projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100.0);
    const viewMatrix = lookAt(vec3(1, 1, 5), vec3(0.0, 0.1, 0.0), vec3(0.0, 1.0, 0.0));
    const modelMatrix = mat4();

    // Get uniform locations
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    const uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
    const uModelMatrix = gl.getUniformLocation(program, "uModelMatrix");

    // Pass the matrices to the shader program
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(uModelMatrix, false, flatten(modelMatrix));

    // Load the OBJ file
    const objFileName = "suzanne.obj";
    const objData = await readOBJFile(objFileName, 1.0, true);

    if (!objData) {
        console.error("Failed to load the OBJ file.");
        return;
    }

    // Create and bind buffers for vertices, normals, and colors
    setupBuffer(gl, program, objData.vertices, "aVertexPosition", 4);
    setupBuffer(gl, program, objData.normals, "aVertexNormal", 4);
    setupBuffer(gl, program, objData.colors, "aVertexColor", 4);

    // Set up element array buffer for indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, objData.indices, gl.STATIC_DRAW);

    // Render the model
    function render() {
        gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, objData.indices.length, gl.UNSIGNED_INT, 0);
    }

    render();
};

// Helper function to set up a buffer and bind it to an attribute
function setupBuffer(gl, program, data, attributeName, size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    const attributeLocation = gl.getAttribLocation(program, attributeName);
    gl.vertexAttribPointer(attributeLocation, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributeLocation);
}
