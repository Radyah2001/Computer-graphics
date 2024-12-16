let gl, program, canvas;

const vertices = [
    vec3(-4.0, -1.0, -1.0),
    vec3(4.0, -1.0, -1.0),
    vec3(4.0, -1.0, -21.0),
    vec3(-4.0, -1.0, -21.0),
];

const textureCoords = [
    vec2(-1.5, 0.0),
    vec2(2.5, 0.0),
    vec2(2.5, 10.0),
    vec2(-1.5, 10.0),
];

const indices = new Uint32Array([0, 1, 2, 3, 0, 2]);
const texSize = 64;

const P = perspective(45, 1, 1, 50);
const V = lookAt(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));

function buildTexels() {
    const numRows = 8;
    const numCols = 8;
    const myTexels = new Uint8Array(4 * texSize * texSize);

    for (let i = 0; i < texSize; ++i) {
        for (let j = 0; j < texSize; ++j) {
            const patchx = Math.floor(i / (texSize / numRows));
            const patchy = Math.floor(j / (texSize / numCols));
            const c = (patchx % 2 !== patchy % 2) ? 255 : 0;

            const index = 4 * (i * texSize + j);
            myTexels.set([c, c, c, 255], index);
        }
    }
    return myTexels;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);
}

function animate() {
    render();
    requestAnimationFrame(animate);
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert("WebGL isn't available!");
        return;
    }

    const ext = gl.getExtension('OES_element_index_uint');
    if (!ext) console.warn('Warning: Unable to use OES_element_index_uint extension');

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Index buffer
    const iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Vertex buffer
    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    const vertexPosition = gl.getAttribLocation(program, "vertexPosition");
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPosition);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "V"), false, flatten(V));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "P"), false, flatten(P));

    // Texture setup
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, buildTexels());
    gl.generateMipmap(gl.TEXTURE_2D);

    // Texture coordinates
    const textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoords), gl.STATIC_DRAW);

    const vertexTextureCoord = gl.getAttribLocation(program, "vertexTextureCoord");
    gl.vertexAttribPointer(vertexTextureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexTextureCoord);

    gl.uniform1i(gl.getUniformLocation(program, "textureMap"), 0);

    // Event listeners
    document.getElementById("textureWrap").addEventListener("change", (event) => {
        const value = parseInt(event.target.value);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, value);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, value);
    });

    document.getElementById("magnificationFilter").addEventListener("change", (event) => {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, parseInt(event.target.value));
    });

    document.getElementById("minificationFilter").addEventListener("change", (event) => {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, parseInt(event.target.value));
    });

    animate();
};
