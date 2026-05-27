import { Mesh, MeshBasicMaterial, TorusGeometry, RingGeometry, CylinderGeometry, MeshStandardMaterial, Group, Color, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, PlaneGeometry, SphereGeometry, AdditiveBlending } from '@iwsdk/core';
import { World } from '@iwsdk/core';

export class Arena {
  group = new Group();
  world: World;
  grid: LineSegments;
  pillars: Mesh[] = [];
  rings: Mesh[] = [];
  orbs: Mesh[] = [];
  time = 0;

  constructor(world: World) {
    this.world = world;
    this.grid = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 }));
    this.build();
  }

  build() {
    // Floor grid
    const floor = new Mesh(new PlaneGeometry(10, 10), new MeshBasicMaterial({ color: 0x000000 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.group.add(floor);

    const verts: number[] = [];
    const size = 5;
    const step = 0.5;
    for (let i = -size; i <= size; i += step) {
      verts.push(-size, 0.01, i, size, 0.01, i);
      verts.push(i, 0.01, -size, i, 0.01, size);
    }
    this.grid.geometry.setAttribute('position', new Float32BufferAttribute(verts, 3));
    this.group.add(this.grid);

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
      const p = new Mesh(new CylinderGeometry(0.08, 0.08, 3, 12), pillarMat.clone());
      p.position.set(Math.cos(ang) * 4.5, 1.5, Math.sin(ang) * 4.5);
      this.group.add(p);
      this.pillars.push(p);
    }

    // Floating deco rings
    for (let i = 0; i < 4; i++) {
      const r = new Mesh(new TorusGeometry(0.6, 0.02, 8, 32), new MeshBasicMaterial({ color: 0xff00ff }));
      r.position.set((Math.random() - 0.5) * 6, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 6);
      r.rotation.x = Math.random() * Math.PI;
      this.group.add(r);
      this.rings.push(r);
    }

    // Ambient orbs
    const orbGeo = new SphereGeometry(0.08, 12, 12);
    for (let i = 0; i < 12; i++) {
      const mat = new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6, blending: AdditiveBlending });
      const o = new Mesh(orbGeo, mat);
      const ang = (i / 12) * Math.PI * 2;
      const rad = 2.5 + Math.random() * 1.5;
      o.position.set(Math.cos(ang) * rad, 0.5 + Math.random() * 1.5, Math.sin(ang) * rad);
      this.group.add(o);
      this.orbs.push(o);
    }

    this.world.scene.add(this.group);
  }

  update(dt: number) {
    this.time += dt;
    // Pulsate grid opacity
    const mat = this.grid.material as LineBasicMaterial;
    mat.opacity = 0.25 + 0.1 * Math.sin(this.time * 2);
    // Pillars pulse
    this.pillars.forEach((p, i) => {
      const s = 1 + 0.05 * Math.sin(this.time * 1.5 + i);
      p.scale.y = s;
      const m = p.material as MeshStandardMaterial;
      m.emissiveIntensity = 0.8 + 0.2 * Math.sin(this.time * 2 + i);
    });
    // Rings rotate
    this.rings.forEach((r, i) => {
      r.rotation.z += dt * (0.3 + i * 0.05);
      r.position.y += Math.sin(this.time * 0.8 + i) * dt * 0.1;
    });
    // Orbs float
    this.orbs.forEach((o, i) => {
      const ang = this.time * 0.3 + i * 0.5;
      const rad = 2.8 + Math.sin(this.time * 0.5 + i) * 0.3;
      o.position.x = Math.cos(ang) * rad;
      o.position.z = Math.sin(ang) * rad;
      o.position.y = 0.8 + Math.sin(this.time * 1.2 + i) * 0.4;
      const m = o.material as MeshBasicMaterial;
      m.opacity = 0.5 + 0.3 * Math.sin(this.time * 2 + i);
    });
  }

  dispose() {
    this.world.scene.remove(this.group);
  }
}
