import React, { useMemo } from 'react'
import { TreeConeMesh } from './TreeConeMesh'
import { TreeRidgeMesh } from './TreeRidgeMesh'
import { TreeFractalMesh } from './TreeFractalMesh'

interface Props {
  forestDensity: number
  windIntensity: number
  windDirectionAngle: number
  depthFactor: number
  areaSize?: number
  visible?: boolean
}

// Terrain generic ground
function Ground({ areaSize }: { areaSize: number }) {
  // Simple procedural noise via shader or just a dark green color
  return (
    <mesh position={[0, 0, -1]}>
      <planeGeometry args={[areaSize, areaSize]} />
      <meshStandardMaterial color="#2d422a" />
    </mesh>
  )
}

export function Forest({ forestDensity, windIntensity, windDirectionAngle, depthFactor, areaSize = 80, visible = true }: Props) {
  // Convert angle (degrees) to direction vector
  const windDirection = useMemo<[number, number]>(() => {
    const rad = (windDirectionAngle * Math.PI) / 180
    return [Math.cos(rad), Math.sin(rad)]
  }, [windDirectionAngle])

  // Split your available tree textures (12 to 16) into groups for different mesh topologies
  // We can just explicitly assign some to each type
  return (
    <group visible={visible}>
      <Ground areaSize={areaSize} />
      
      {/* Lights tailored for the 2.5D top-down scene */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, -50, 100]} intensity={1.5} />
      <directionalLight position={[-100, 50, 50]} intensity={0.5} />

      {/* Scattered Cone Shapes */}
      {[12].map((index) => (
        <TreeConeMesh
          key={`cone-${index}`}
          textureIndex={index}
          count={forestDensity}
          windIntensity={windIntensity}
          windDirection={windDirection}
          depthFactor={depthFactor}
          areaSize={areaSize}
          positionOffset={[-5, 5]}
        />
      ))}

      {/* Scattered Ridge/Mountain Shapes */}
      {[13, 15].map((index) => (
        <TreeRidgeMesh
          key={`ridge-${index}`}
          textureIndex={index}
          count={forestDensity}
          windIntensity={windIntensity}
          windDirection={windDirection}
          depthFactor={depthFactor}
          areaSize={areaSize}
          positionOffset={[10, -10]}
        />
      ))}

      {/* Scattered Fractal Shapes */}
      {[14, 16].map((index) => (
        <TreeFractalMesh
          key={`fractal-${index}`}
          textureIndex={index}
          count={forestDensity}
          windIntensity={windIntensity}
          windDirection={windDirection}
          depthFactor={depthFactor}
          areaSize={areaSize}
          positionOffset={[-10, 0]}
        />
      ))}
    </group>
  )
}
