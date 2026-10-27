import * as THREE from 'three'

/**
 * Effet "objet shiny" de la dernière étape, partagé par tous les matériaux de la maison :
 * une bande de lumière blanche qui balaie la maison de bas en haut.
 * `uShine` (0 → 1) l'allume en fondu, `uShineTime` fait avancer le balayage.
 */
export const shineUniforms = {
  uShine: { value: 0 },
  uShineTime: { value: 0 },
}

export function addShine(material: THREE.Material) {
  material.customProgramCacheKey = () => 'bp-shine-v1'
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShine = shineUniforms.uShine
    shader.uniforms.uShineTime = shineUniforms.uShineTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vShineWorld;')
      .replace(
        '#include <fog_vertex>',
        '#include <fog_vertex>\nvShineWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uShine;\nuniform float uShineTime;\nvarying vec3 vShineWorld;',
      )
      .replace(
        '#include <tonemapping_fragment>',
        /* glsl */ `
        if (uShine > 0.001) {
          // bande lumineuse légèrement en diagonale, qui monte toutes les ~5 s
          // (la fin de course est au-dessus de la maison : ça laisse une pause entre deux passages)
          float sweep = mix(-3.2, 7.0, fract(uShineTime * 0.2));
          float coord = vShineWorld.y + vShineWorld.x * 0.35;
          float band = exp(-pow((coord - sweep) * 2.4, 2.0));
          gl_FragColor.rgb += uShine * band * vec3(0.45);
        }
        #include <tonemapping_fragment>`,
      )
  }
}
