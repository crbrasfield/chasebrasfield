(function () {
  const canvas = document.getElementById('shader-bg');
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  const vertSrc = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragSrc = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      float aspect = u_resolution.x / u_resolution.y;
      vec2 p = vec2(uv.x * aspect, uv.y);

      // Softened palette — less contrast
      vec3 base = vec3(0.0, 0.0, 0.0);
      vec3 blue = vec3(0.22, 0.28, 0.62);

      // Cloud radius shrinks on narrow screens so blobs stay separate
      float narrow = smoothstep(1.2, 0.5, aspect);
      float rScale = mix(1.0, 0.55, narrow);

      // Soft cloud blobs that drift slowly
      float cloud = 0.0;

      vec2 b1 = vec2(
        0.3 * aspect + 0.25 * sin(u_time * 0.09),
        0.78 + 0.15 * cos(u_time * 0.11 + 1.0)
      );
      cloud += smoothstep(0.55 * rScale, 0.0, length(p - b1));

      vec2 b2 = vec2(
        0.78 * aspect + 0.2 * cos(u_time * 0.08 + 2.0),
        0.18 + 0.15 * sin(u_time * 0.1)
      );
      cloud += 0.7 * smoothstep(0.5 * rScale, 0.0, length(p - b2));

      vec2 b3 = vec2(
        0.6 * aspect + 0.18 * sin(u_time * 0.065 + 3.0),
        0.5 + 0.18 * cos(u_time * 0.085 + 1.5)
      );
      cloud += 0.5 * smoothstep(0.4 * rScale, 0.0, length(p - b3));

      vec2 b4 = vec2(
        0.12 * aspect + 0.15 * cos(u_time * 0.075 + 4.0),
        0.4 + 0.18 * sin(u_time * 0.095 + 2.5)
      );
      cloud += 0.45 * smoothstep(0.38 * rScale, 0.0, length(p - b4));

      cloud = clamp(cloud, 0.0, 1.0);

      // 45-degree rotated halftone grid
      float cellSize = 6.0;
      mat2 rot = mat2(0.7071, -0.7071, 0.7071, 0.7071);
      vec2 rc = rot * gl_FragCoord.xy;
      vec2 cell = fract(rc / cellSize) - 0.5;
      float d = length(cell);

      // Dot radius scales with cloud intensity
      float radius = cloud * 0.43;
      float dot = 1.0 - smoothstep(radius - 0.03, radius + 0.03, d);

      vec3 color = mix(base, blue, dot);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vert = createShader(gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return;

  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'u_resolution');
  const uTime = gl.getUniformLocation(program, 'u_time');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resize);
  resize();

  const start = performance.now();

  function render() {
    const t = (performance.now() - start) / 1000;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }

  render();
})();
