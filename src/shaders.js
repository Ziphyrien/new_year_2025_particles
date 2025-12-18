const vertexShader = `
uniform float uTime;
uniform float uProgress;
uniform float uSize;

attribute vec3 aTarget;
attribute float aRandom;

varying vec3 vPosition;
varying float vProgress;

// Simplex 3D Noise 
// by Ian McEwan, Ashima Arts
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0.0 + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  // Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients
  // ( N=0.78539816339744830961566084581988 )
  float n_ = 1.0/7.0; // N/7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
    // Progressive transition logic
    // Spread the transition over a wider range based on aRandom
    // This ensures particles don't all move at once
    float stagger = 0.8; 
    float particleProgress = smoothstep(0.0, 1.0, (uProgress * (1.0 + stagger)) - (aRandom * stagger));

    vProgress = particleProgress;
    
    // Base interpolation
    vec3 mixedPosition = mix(position, aTarget, particleProgress);
    
    // Vortex & Scatter Logic
    // Intensity peaks at 0.5 (mid-transition)
    float intensity = sin(particleProgress * 3.14159); 
    
    // 1. Vortex Rotation (CW -> CCW)
    // Calculate radius from center
    float radius = length(mixedPosition.xy);
    
    // Angle depends on progress (intensity) and radius (inner spins faster)
    // Negative factor = CW rotation
    // As intensity goes 0 -> 1 -> 0, the text twists CW then untwists CCW
    // Increased multiplier from -15.0 to -40.0 for stronger vortex
    float twist = -40.0 * intensity * (1.0 / (radius + 0.1));
    
    // Add some spiral variation based on randomness
    twist += (aRandom - 0.5) * intensity * 5.0;
    
    float s = sin(twist);
    float c = cos(twist);
    mat2 rotation = mat2(c, -s, s, c);
    
    // Apply rotation
    vec3 finalPos = mixedPosition;
    finalPos.xy = rotation * finalPos.xy;
    
    // 2. Scatter (Explosion)
    // Push outwards from center
    vec3 dir = normalize(finalPos); 
    // Avoid zero vector issues at center
    if (length(finalPos) < 0.001) dir = vec3(0.0, 1.0, 0.0);
    
    // Increased expansion range
    float expansion = intensity * 8.0 * (0.5 + aRandom);
    finalPos += dir * expansion;
    
    // 3. Noise Turbulence
    vec3 noiseVec = vec3(
        snoise(vec3(mixedPosition.x, uTime * 0.5, 0.0)),
        snoise(vec3(mixedPosition.y, uTime * 0.5, 1.0)),
        snoise(vec3(mixedPosition.z, uTime * 0.5, 2.0))
    );
    finalPos += noiseVec * intensity * 3.0;
    
    // 4. Z-axis depth (3D feel)
    finalPos.z += intensity * 6.0 * (aRandom - 0.3);
    
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = uSize * (1.0 / -mvPosition.z);
    
    vPosition = finalPos;
}
`;

const fragmentShader = `
uniform vec3 uColorCold;
uniform vec3 uColorWarm;

varying float vProgress;

void main() {
    // Circular particle
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    
    // Glow effect: 0.05 / distance - 0.1 gives a nice soft glow
    float strength = 0.05 / distanceToCenter - 0.1;
    
    // Color mixing
    vec3 color = mix(uColorCold, uColorWarm, vProgress);
    
    gl_FragColor = vec4(color, strength);
}
`;

export { vertexShader, fragmentShader };
