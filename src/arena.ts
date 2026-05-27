import { Mesh, MeshBasicMaterial, TorusGeometry, RingGeometry, CylinderGeometry, MeshStandardMaterial, Group, Color, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import { World } from '@iwsdk/core';

export class Arena {
  group = new Group();
  world: World;

  constructor(world: World) {
    this.world = world;
    this.build();
  }

  build() {
    // Floor grid
    const floor = new Mesh(new PlaneGeometry(10, 10), new MeshBasicMaterial({ color: 0x000000 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.group.add(floor);

    const grid = new LineSegments(
      new BufferGeometry(),
      new LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 })
    );
    const verts: number[] = [];
    const size = 5;
    const step = 0.5;
    for (let i = -size; i <= size; i += step) {
      verts.push(-size, 0.01, i, size, 0.01, i);
      verts.push(i, 0.01, -size, i, 0.01, size);
    }
    grid.geometry.setAttribute('position', new Float32BufferAttribute(verts, 3));
    this.group.add(grid);

    // Ring boundary
    const ring = new Mesh(new TorusGeometry(3.5, 0.05, 16, 64), new MeshBasicMaterial({ color: 0x00ffff }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    this.group.add(ring);

    // Center platform
    const plat = new Mesh(new CylinderGeometry(1.2, 1.2, 0.1, 32), new MeshStandardMaterial({ color: 0x111122, emissive: 0x002244, metalness: 0.8, roughness: 0.3 }));
    plat.position.y = 0.05;
    this.group.add(plat);

    // Neon pillars
    const pillarMat = new MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaaa, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const p = new Mesh(new CylinderGeometry(0.08, 0.08, 3, 12), pillarMat);
      p.position.set(Math.cos(ang) * 4.5, 1.5, Math.sin(ang) * 4.5);
      this.group.add(p);
    }

    // Floating deco rings
    for (let i = 0; i < 4; i++) {
      const r = new Mesh(new TorusGeometry(0.6, 0.02, 8, 32), new MeshBasicMaterial({ color: 0xff00ff }));
      r.position.set((Math.random() - 0.5) * 6, 1.5 + Math.random(), (Math.random() - 0.5) * 6);
      r.rotation.x = Math.random() * Math.PI;
      this.group.add(r);
    }

    this.world.scene.add(this.group);
  }

  dispose() {
    this.world.scene.remove(this.group);
  }
}
