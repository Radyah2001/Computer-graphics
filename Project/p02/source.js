// ------------------ Global Variables ------------------
var gl;
var groundProgram;
var teapotProgram;
var framebuffer;
var canvas;
var drawingInfo;
var g_drawingInfo; // The information for drawing the 3D model

// Ground geometry data
var groundVertices = flatten([
    vec3(-2.0, -1.0, -1.0),
    vec3(2.0, -1.0, -1.0),
    vec3(2.0, -1.0, -5.0),
    vec3(-2.0, -1.0, -5.0)
]);

const groundTextureCoords = flatten([
    vec2(0.0, 0.0),
    vec2(1.0, 0.0),
    vec2(1.0, 1.0),
    vec2(0.0, 1.0)
]);

const groundIndices = new Uint32Array([0, 1, 2, 3, 0, 2]);

// Projection and view configurations
const P = perspective(100, 1, 0.2, 50);
const defaultV = lookAt(vec3(0.0, 0.0, -1.0), vec3(0.0, -1.0, -3.0), vec3(0.0, 1.0, 0.0));

// Shadow projection matrix
const Mp = mat4();
Mp[0][0] = 1.0;
Mp[1][1] = 1.0;
Mp[2][2] = 1.0;
Mp[3][3] = 0.0;
Mp[3][1] = 1.0 / (-1 - 2 - 0.0001); 

// Teapot default transformation
const teapotDefaultM = translate(0.0, -1.0, -3.0);

// Reflection transform
let T_g = translate(0.0, -1.0, 0.0);
let T_neg_g = translate(0.0, 1.0, 0.0);
let S_mirror = scalem(1.0, -1.0, 1.0);
const R = mult(T_g, mult(S_mirror, T_neg_g));

const I = mat4();

// Animation states
var orbiting = true;
var bouncing = true;
var orbit_theta = 0;
var bounce_theta = 0;
var prevTimeStamp = 0;
var viewPoint = 0;

// ------------------ Rendering Functions ------------------

function render(timeStamp) {
    let diff = (timeStamp - prevTimeStamp) / 1000;

    // Update orbit and bounce animations
    if (orbiting && diff !== undefined) {
        orbit_theta += diff / 2;
    }
    if (bouncing && diff !== undefined) {
        bounce_theta += diff * 2;
    }

    // Calculate light position and views
    let lightPosition = vec4(2*Math.cos(orbit_theta), 2.0, -2.0 + 2*Math.sin(orbit_theta), 1.0);
    let lightV = lookAt(vec3(lightPosition), vec3(0.0, -1.0, -3.0), vec3(0.0, 1.0, 0.0));

    let orbitFactor = 1.5;
    let orbitRadius = 2.0;
    let orbitV = lookAt(
        vec3(
            orbitRadius * Math.cos(orbit_theta * orbitFactor), 
            1.0, 
            -3.0 + orbitRadius * Math.sin(orbit_theta * orbitFactor)
        ),
        vec3(0.0, -1.0, -3.0),
        vec3(0.0, 1.0, 0.0)
    );

    // Select current viewpoint
    var V;
    if (viewPoint == 0) {
        V = defaultV;
    } else if (viewPoint == 1) {
        V = orbitV;
    } else if (viewPoint == 2) {
        V = lightV;
    }

    // Calculate teapot's model matrix with bouncing
    let teapotM = mult(teapotDefaultM, translate(0.0, 1.5 * Math.abs(Math.sin(bounce_theta)), 0.0));

    // ----------- Draw into Framebuffer (Depth Map) -----------
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, 512, 512);

    // Draw ground to framebuffer
    gl.useProgram(groundProgram);
    initAttributeVariable(groundProgram.vertexBuffer);
    initAttributeVariable(groundProgram.vertexTextureCoordBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundProgram.indexBuffer);
    gl.uniformMatrix4fv(groundProgram.V, false, flatten(lightV));
    gl.uniformMatrix4fv(groundProgram.lightV, false, flatten(lightV));
    gl.uniform1i(groundProgram.renderDepth, 1);
    gl.uniform1i(groundProgram.shadowMap, 0);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);

    // Draw teapot to framebuffer
    gl.useProgram(teapotProgram);
    initAttributeVariable(teapotProgram.vertexBuffer);
    initAttributeVariable(teapotProgram.colorBuffer);
    initAttributeVariable(teapotProgram.normalBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotProgram.indexBuffer);
    gl.uniformMatrix4fv(teapotProgram.V, false, flatten(lightV));
    gl.uniformMatrix4fv(teapotProgram.lightV, false, flatten(lightV));
    gl.uniformMatrix4fv(teapotProgram.M, false, flatten(teapotM));
    gl.uniformMatrix4fv(teapotProgram.R, false, flatten(I));
    gl.uniform4fv(teapotProgram.lightPosition, lightPosition);
    gl.uniform1i(teapotProgram.shadowMap, 0);
    gl.uniform1i(teapotProgram.renderDepth, 1);
    gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_INT, 0);

    // ----------- Draw to Screen -----------
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Draw teapot on screen with reflection
    gl.useProgram(teapotProgram);
    initAttributeVariable(teapotProgram.vertexBuffer);
    initAttributeVariable(teapotProgram.colorBuffer);
    initAttributeVariable(teapotProgram.normalBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotProgram.indexBuffer);
    
    gl.uniformMatrix4fv(teapotProgram.V, false, flatten(V));
    gl.uniformMatrix4fv(teapotProgram.lightV, false, flatten(lightV));
    gl.uniformMatrix4fv(teapotProgram.M, false, flatten(teapotM));
    gl.uniformMatrix4fv(teapotProgram.R, false, flatten(R));
    gl.uniform4fv(teapotProgram.lightPosition, lightPosition);
    gl.uniform1i(teapotProgram.renderDepth, 0);
    gl.uniform1i(teapotProgram.shadowMap, 1);
    gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_INT, 0);

    // Draw ground with blending
    gl.useProgram(groundProgram);
    initAttributeVariable(groundProgram.vertexBuffer);
    initAttributeVariable(groundProgram.vertexTextureCoordBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundProgram.indexBuffer);
    gl.uniformMatrix4fv(groundProgram.V, false, flatten(V));
    gl.uniformMatrix4fv(groundProgram.lightV, false, flatten(lightV));
    gl.uniform1i(groundProgram.renderDepth, 0);
    gl.uniform1i(groundProgram.shadowMap, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);
    gl.depthFunc(gl.LESS);
    gl.disable(gl.BLEND);

    // Draw teapot again without reflection
    gl.useProgram(teapotProgram);
    initAttributeVariable(teapotProgram.vertexBuffer);
    initAttributeVariable(teapotProgram.colorBuffer);
    initAttributeVariable(teapotProgram.normalBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotProgram.indexBuffer);
    gl.uniformMatrix4fv(teapotProgram.R, false, flatten(I));
    gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
    
    prevTimeStamp = timeStamp;
}

function animate(timeStamp) {
    if (!g_drawingInfo) {
        // Load model data when available
        g_drawingInfo = onReadComplete(gl, teapotProgram, drawingInfo);
    }
    if (g_drawingInfo) {
        render(timeStamp);
    }
    requestAnimationFrame(animate);
}

// ------------------ Utility Functions ------------------

function initAttributeVariable(buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(buffer.loc, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(buffer.loc);
}

function onReadComplete(gl, program, drawingInfo) {
    // Once OBJ/MTL is loaded, push data into buffers
    console.log(drawingInfo.colors);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, program.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, program.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, program.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    return drawingInfo;
}

function createBuffer(program, attributeName, num, type) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    buffer.loc = gl.getAttribLocation(program, attributeName);
    buffer.attributeName = attributeName;
    buffer.num = num;
    buffer.type = type;
    gl.vertexAttribPointer(buffer.loc, num, type, false, 0, 0);
    gl.enableVertexAttribArray(buffer.loc);

    return buffer;
}

function initGroundProgram() {
    groundProgram = initShaders(gl, "vertex-shader-ground", "fragment-shader-ground");
    gl.useProgram(groundProgram);

    // Create and fill buffers for ground
    groundProgram.vertexBuffer = createBuffer(groundProgram, "vertexPosition", 3, gl.FLOAT);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);

    groundProgram.vertexTextureCoordBuffer = createBuffer(groundProgram, "vertexTextureCoord", 2, gl.FLOAT);
    gl.bufferData(gl.ARRAY_BUFFER, groundTextureCoords, gl.STATIC_DRAW);

    groundProgram.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundProgram.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, groundIndices, gl.STATIC_DRAW);

    // Set uniforms
    groundProgram.P = gl.getUniformLocation(groundProgram, "P");
    gl.uniformMatrix4fv(groundProgram.P, false, flatten(P));

    groundProgram.V = gl.getUniformLocation(groundProgram, "V");
    groundProgram.lightV = gl.getUniformLocation(groundProgram, "lightV");

    groundProgram.M = gl.getUniformLocation(groundProgram, "M");
    gl.uniformMatrix4fv(groundProgram.M, false, flatten(I));

    groundProgram.visibility = gl.getUniformLocation(groundProgram, "visibility");
    groundProgram.textureMap = gl.getUniformLocation(groundProgram, "textureMap");
    gl.uniform1i(groundProgram.textureMap, 0);
    groundProgram.shadowMap = gl.getUniformLocation(groundProgram, "shadowMap");
    gl.uniform1i(groundProgram.shadowMap, 1);
    groundProgram.renderDepth = gl.getUniformLocation(groundProgram, "renderDepth");

    // Load ground texture
    var image = document.createElement('img');
    image.crossorigin = 'anonymous';
    image.onload = function () {
        gl.useProgram(groundProgram);
        var groundTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);

        gl.uniform1i(groundProgram.textureMap, 0);
    };
    image.src = '../xamp23.png';
}

async function initTeapotProgram() {
    try {
        teapotProgram = initShaders(gl, "vertex-shader-teapot", "fragment-shader-teapot");
        gl.useProgram(teapotProgram);

        // Create and configure buffers for the teapot
        teapotProgram.vertexBuffer = createBuffer(teapotProgram, "vertexPosition", 4, gl.FLOAT);
        teapotProgram.colorBuffer = createBuffer(teapotProgram, "vertexColor", 4, gl.FLOAT);
        teapotProgram.normalBuffer = createBuffer(teapotProgram, "vertexNormal", 4, gl.FLOAT);
        
        teapotProgram.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotProgram.indexBuffer);

        // Set uniforms
        teapotProgram.P = gl.getUniformLocation(teapotProgram, "P");
        gl.uniformMatrix4fv(teapotProgram.P, false, flatten(P));

        teapotProgram.V = gl.getUniformLocation(teapotProgram, "V");
        teapotProgram.lightV = gl.getUniformLocation(teapotProgram, "lightV");

        teapotProgram.M = gl.getUniformLocation(teapotProgram, "M");
        gl.uniformMatrix4fv(teapotProgram.M, false, flatten(I));

        teapotProgram.R = gl.getUniformLocation(teapotProgram, "R");

        teapotProgram.emissionL = gl.getUniformLocation(teapotProgram, "emissionL");
        gl.uniform1f(teapotProgram.emissionL, 1.0);

        teapotProgram.ambientK = gl.getUniformLocation(teapotProgram, "ambientK");
        gl.uniform1f(teapotProgram.ambientK, 0.5);
        
        teapotProgram.diffuseK = gl.getUniformLocation(teapotProgram, "diffuseK");
        gl.uniform1f(teapotProgram.diffuseK, 0.5);
        
        teapotProgram.specularK = gl.getUniformLocation(teapotProgram, "specularK");
        gl.uniform1f(teapotProgram.specularK, 0.5);
        
        teapotProgram.shininess = gl.getUniformLocation(teapotProgram, "shininess");
        gl.uniform1f(teapotProgram.shininess, 100.0);

        teapotProgram.lightPosition = gl.getUniformLocation(teapotProgram, "lightPosition");
        teapotProgram.renderDepth = gl.getUniformLocation(teapotProgram, "renderDepth");
        teapotProgram.shadowMap = gl.getUniformLocation(teapotProgram, "shadowMap");

        // Load the teapot model
        console.log("Loading teapot model...");
        drawingInfo = await readOBJFile("../teapot.obj", 0.25, false);
        if (!drawingInfo) {
            console.error("Failed to load teapot model");
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error initializing teapot program:", error);
        return false;  
    }
}

function initFramebuffer() {
    framebuffer = gl.createFramebuffer();
    framebuffer.texture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 512, 512);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, framebuffer.texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (e !== gl.FRAMEBUFFER_COMPLETE) {
        console.log('Framebuffer object is incomplete: ' + e.toString());
        return null;
    }
}

// ------------------ Entry Point ------------------

window.onload = async function init() {
    // Setup
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas, { alpha: false, stencil: true });

    if (!gl) {
        alert("WebGL isn't available!");
    }

    var ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
      console.log('Warning: Unable to use OES_element_index_uint extension');
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.enable(gl.DEPTH_TEST);

    initGroundProgram();    
    await initTeapotProgram();
    initFramebuffer();

    // UI controls
    var bouncingValueSpan = document.getElementById("bouncingValue");
    document.getElementById("toggleBounce").addEventListener("click", () => {
        bouncing = !bouncing;
        bouncingValueSpan.textContent = bouncing.toString();
    });

    var orbitingValueSpan = document.getElementById("orbitingValue");
    document.getElementById("toggleOrbit").addEventListener("click", () => {
        orbiting = !orbiting;
        orbitingValueSpan.textContent = orbiting.toString();
    });

    const viewPointSelect = document.getElementById("viewPointSelect");
    viewPointSelect.addEventListener("change", () => {
        viewPoint = viewPointSelect.value;
    });

    function addSliderCallback(name, uniformLoc) {
        var elem = document.getElementById(name + "SliderValue");
        document.getElementById(name + "Slider").addEventListener("input", (event) => {
            let newVal = event.target.value;
            gl.uniform1f(uniformLoc, newVal);
            elem.textContent = newVal;
        });
    }

    addSliderCallback("ambientK", teapotProgram.ambientK);
    addSliderCallback("diffuseK", teapotProgram.diffuseK);
    addSliderCallback("specularK", teapotProgram.specularK);
    addSliderCallback("shininess", teapotProgram.shininess);
    addSliderCallback("lightEmission", teapotProgram.lightEmission);

    // Start animation loop
    requestAnimationFrame(animate);
};
