/**
 * 天空着色器：星场 + 星云 + 黑洞（引力透镜、光子环、吸积盘及其被弯折的像）。
 * 全部是程序化生成，没有任何贴图；只依赖 WebGL1（几乎所有设备都支持）。
 *
 * 物理上做了取舍：用“薄透镜”近似时空弯曲（源位置 = 观察位置 − θE²/θ），
 * 吸积盘用倾斜椭圆 + 开普勒较差旋转，再叠一圈被弯折到黑洞上下方的盘像。
 * 视觉上追求“看起来对”，不是光线追踪。
 */

export const VERT = /* glsl */ `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAG = /* glsl */ `
precision highp float;

uniform vec2  uRes;     // 画布像素尺寸
uniform float uTime;    // 秒
uniform vec2  uCenter;  // 黑洞中心，0..1，原点在左下
uniform float uRs;      // 阴影半径，单位：min(宽,高)
uniform float uQ;       // 吸积盘短长轴比（越小越“侧视”）
uniform float uDisk;    // 吸积盘亮度
uniform float uStars;   // 星星密度 0..1
uniform float uNeb;     // 星云强度
uniform vec2  uPar;     // 视差，-1..1
uniform float uFlash;   // 金色闪光（进入时）
uniform float uDim;     // 整体亮度

#define PI 3.14159265

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x),
             mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

/* 沿 x 方向周期为 P 的噪声：角向纹理绕一圈首尾无缝（避免 atan 的接缝） */
float vnp(vec2 p, float P) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = h21(vec2(mod(i.x, P), i.y));
  float b = h21(vec2(mod(i.x + 1.0, P), i.y));
  float c = h21(vec2(mod(i.x, P), i.y + 1.0));
  float d = h21(vec2(mod(i.x + 1.0, P), i.y + 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbmp(vec2 p, float P) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnp(p, P); p = p * 2.0 + vec2(0.0, 9.2); P *= 2.0; a *= 0.5; }
  return v;
}

vec3 starfield(vec2 uv, float t) {
  vec3 col = vec3(0.0);
  for (int l = 0; l < 3; l++) {
    float fl = float(l);
    float sc = 16.0 + fl * 24.0;
    vec2 g = uv * sc + fl * 31.7;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = h21(id + fl * 13.1);
    float present = step(1.0 - uStars * (0.2 - fl * 0.045), h);
    vec2 off = (vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5) * 0.6;
    float d = length(f - off);
    float mag = h21(id + 9.9);
    float size = (0.03 + 0.075 * mag) * (1.0 - fl * 0.18);
    float tw = 0.7 + 0.3 * sin(t * (0.7 + mag * 2.2) + h * 60.0);
    float s = smoothstep(size, 0.0, d) * tw * (0.3 + 1.1 * mag * mag);
    vec3 tint = mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.82, 0.58), h21(id + 5.5));
    col += present * s * tint * (1.5 - fl * 0.32);
  }
  return col;
}

void main() {
  float m = min(uRes.x, uRes.y);
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - uCenter * uRes) / m;
  float rs = uRs;
  float r = length(p);
  vec2 dir = p / max(r, 1e-4);

  /* ---- 引力透镜：把背景按“薄透镜”重新映射 ---- */
  float te = rs * 1.34;
  float k = te * te / max(r, rs * 0.55);
  vec2 src = p - dir * k;
  vec2 par = uPar * 0.025;

  vec3 col = starfield(src * 1.1 + par + vec2(2.3, 5.1), uTime);

  float n1 = fbm(src * 1.25 + vec2(uTime * 0.004, 0.0) + par * 2.0);
  float n2 = fbm(src * 3.2 + 7.3);
  vec3 neb = mix(vec3(0.015, 0.025, 0.085), vec3(0.11, 0.07, 0.17), n1) * smoothstep(0.32, 0.85, n1) * (0.55 + n2);
  neb += vec3(0.2, 0.13, 0.04) * smoothstep(0.58, 0.92, n2) * 0.06;
  col += neb * uNeb;

  /* ---- 阴影 ---- */
  float inside = smoothstep(rs, rs * 0.985, r);
  col *= 1.0 - inside;

  /* ---- 被弯折的盘像（黑洞上下方的亮环）---- */
  float rh = rs * 1.16;
  float hw = rs * 0.075;
  float up = smoothstep(-0.3, 0.95, p.y / max(r, 1e-3));
  float ringD = (r - rh) / hw;
  float halo = exp(-ringD * ringD) * (0.16 + 0.84 * up);
  float bulge = exp(-pow((r - (rh + rs * 0.07 * up)) / (hw * 2.4), 2.0)) * 0.2 * up;
  float ha = atan(p.y, p.x);
  float htex = 0.45 + 0.9 * fbmp(vec2((ha / (2.0 * PI) + 0.5 + uTime * 0.02) * 6.0, r / rs * 7.0), 6.0);
  float hdop = 0.55 + 0.7 * smoothstep(1.0, -1.0, p.x / max(r, 1e-3));
  col += vec3(1.0, 0.82, 0.55) * (halo + bulge) * htex * hdop * uDisk * 1.55;

  /* ---- 光子环 ---- */
  float pr = exp(-pow((r - rs * 1.012) / (rs * 0.03), 2.0));
  col += vec3(1.0, 0.9, 0.72) * pr * 0.42 * hdop * uDisk;
  float pr2 = exp(-pow((r - rs * 1.0) / (rs * 0.008), 2.0));
  col += vec3(1.0, 0.97, 0.9) * pr2 * 0.22 * (0.4 + 0.6 * hdop) * uDisk;

  /* ---- 吸积盘（倾斜椭圆 + 较差旋转）---- */
  vec2 dp = vec2(p.x, p.y / uQ);
  float rho = length(dp);
  float rin = rs * 1.22;
  float rout = rs * 4.6;
  float phi = atan(dp.y, dp.x);
  float rr = max(rho / rs, 1.0);
  float ang = phi + uTime * 0.5 * pow(rr, -1.5);
  float au = ang / (2.0 * PI) + 0.5;
  float tex = 0.3 + 1.0 * fbmp(vec2(au * 10.0, rr * 5.2), 10.0) + 0.5 * fbmp(vec2(au * 24.0, rr * 15.0), 24.0);
  float prof = pow(rin / max(rho, rin * 0.5), 1.75) * smoothstep(rout, rout * 0.42, rho) * smoothstep(rin * 0.9, rin * 1.1, rho);
  float side = -dp.x / max(rho, 1e-3);
  float dop = 0.1 + 1.05 * pow(clamp(0.5 + 0.5 * side, 0.0, 1.0), 1.8);
  float tt = clamp((rr - 1.15) / 3.4, 0.0, 1.0);
  vec3 dc = mix(vec3(1.0, 0.94, 0.8), mix(vec3(1.0, 0.7, 0.32), vec3(0.72, 0.26, 0.08), tt), smoothstep(0.0, 0.5, tt));
  float near = smoothstep(0.012, -0.012, p.y);
  float farMask = mix(smoothstep(rs * 0.985, rs * 1.02, r), 1.0, near);
  col += dc * prof * tex * dop * farMask * uDisk * 2.3;

  /* ---- 光晕 ---- */
  col += vec3(1.0, 0.72, 0.36) * exp(-r / (rs * 2.6)) * 0.05 * uDisk;
  col += vec3(0.32, 0.48, 0.95) * exp(-pow((r - rs * 2.0) / (rs * 1.0), 2.0)) * 0.016;

  col += vec3(1.0, 0.8, 0.45) * uFlash * exp(-r / (rs * 3.2));

  /* ---- 色调映射、暗角、颗粒 ---- */
  col += vec3(0.011, 0.013, 0.03);
  col = 1.0 - exp(-col * 1.35);
  vec2 q2 = (frag / uRes - 0.5) * vec2(1.05, 1.0);
  col *= 1.0 - 0.42 * dot(q2, q2);
  col *= uDim;
  col += (h21(frag + fract(uTime) * 91.7) - 0.5) * 0.011;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;
