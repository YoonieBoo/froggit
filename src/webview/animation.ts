import type { Sprite } from './renderer';

export interface Animation {
  frames: Sprite[];
  fps: number;
  loop: boolean;
}

/** Tracks playback time for one animation at a time. */
export class AnimationPlayer {
  private current?: Animation;
  private time = 0;

  /** Starts an animation. Replaying the same one only restarts if `restart` is set. */
  play(animation: Animation, restart = false): void {
    if (animation === this.current && !restart) return;
    this.current = animation;
    this.time = 0;
  }

  update(dt: number): void {
    this.time += dt;
  }

  get frame(): Sprite {
    const anim = this.current!;
    const index = Math.floor(this.time * anim.fps);
    return anim.loop
      ? anim.frames[index % anim.frames.length]
      : anim.frames[Math.min(index, anim.frames.length - 1)];
  }

  /** True once a non-looping animation has shown its last frame for its full duration. */
  get done(): boolean {
    const anim = this.current;
    return !!anim && !anim.loop && this.time >= anim.frames.length / anim.fps;
  }
}
