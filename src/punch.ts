import { Vector3 } from '@iwsdk/core';
import { PunchType } from './types';

export class PunchDetector {
  private lastPos = new Vector3();
  private velocity = new Vector3();
  private wasTrigger = false;
  private punchStartTime = 0;

  detect(controllerPos: Vector3, trigger: boolean, grip: boolean, headPos: Vector3): { punching: boolean; type: PunchType; power: number } | null {
    const dt = 0.016;
    this.velocity.copy(controllerPos).sub(this.lastPos).divideScalar(dt);
    this.lastPos.copy(controllerPos);

    const speed = this.velocity.length();
    const isPunching = trigger && !this.wasTrigger && speed > 2.5;

    this.wasTrigger = trigger;

    if (isPunching) {
      this.punchStartTime = performance.now();
      const relY = controllerPos.y - headPos.y;
      const relX = Math.abs(controllerPos.x - headPos.x);
      
      let type: PunchType = 'jab';
      if (relY > 0.15) type = 'uppercut';
      else if (relX > 0.25) type = 'hook';
      else if (speed > 4.0) type = 'cross';

      const power = Math.min(1, speed / 6);
      return { punching: true, type, power };
    }

    if (grip) {
      return { punching: false, type: 'jab', power: 0 };
    }

    return null;
  }

  getBlockState(grip: boolean): boolean {
    return grip;
  }
}
