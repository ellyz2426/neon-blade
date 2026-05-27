import { World } from '@iwsdk/core';
import { createRing } from './ring';
import { BoxingGame } from './game';

async function main() {
  const container = document.getElementById('app') as HTMLDivElement;
  
  const world = await World.create(container, {
    xr: { offer: 'once' },
    input: { canvasPointerEvents: true },
    features: {
      grabbing: true,
      physics: true,
      spatialUI: true,
    },
    render: {
      camera: { position: [0, 1.6, 1.5], lookAt: [0, 1.2, -0.5] }
    }
  });

  // Lighting
  const { AmbientLight, DirectionalLight } = await import('@iwsdk/core');
  world.scene.add(new AmbientLight(0x222244, 0.6));
  const dir = new DirectionalLight(0x00ffff, 0.8);
  dir.position.set(2, 4, 2);
  world.scene.add(dir);

  // Ring
  const ring = createRing();
  world.scene.add(ring);

  // Game
  const game = new BoxingGame(world);
  await game.init();

  console.log('Neon Boxing VR initialized');
}

main().catch(console.error);
