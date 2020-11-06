import { Vec3 } from "../core";

/**
 * p = p + ˙pt + ¨p t22
 * 
 * force equation: f = ma = m¨p
 * inverse mass: ¨p = f * 1/m
 */
export class Particle {

    /** 
     * Holds the linear position of the particle in
     * world space.
     */
    position = new Vec3();

    /**
     * Holds the linear velocity of the particle in
     * world space.
     */
    velocity = new Vec3();

    /**
     * Holds the acceleration of the particle. This value
     * can be used to set acceleration due to gravity (its primary
     * use) or any other constant acceleration.
     */
    acceleration = new Vec3();

    /**
    * Holds the amount of damping applied to linear
    * motion. Damping is required to remove energy added
    * through numerical instability in the integrator.
    */
    damping = 0.1;

    /**
    * Holds the inverse of the mass of the particle. It
    * is more useful to hold the inverse mass because
    * integration is simpler and because in real-time
    * simulation it is more useful to have objects with
    * infinite mass (immovable) than zero mass
    * (completely unstable in numerical simulation).
    */
    inverseMass = 1;
    mass = 1;

    forceAccum = new Vec3();

    integrate (duration: number): void {
        // assert(duration > 0.0);
        const position = this.position;
        const velocity = this.velocity;
        const acceleration = this.acceleration;
        const forceAccum = this.forceAccum;
        const inverseMass = this.inverseMass;
        const damping = this.damping;

        // Update linear position.
        // new_p = old_p + v * t;
        Vec3.scaleAndAdd(position, position, velocity, duration);
        // Work out the acceleration from the force.
        // new_a = old_a + total_f * (1 / m)
        let resultingAcc = acceleration.clone();
        Vec3.scaleAndAdd(resultingAcc, resultingAcc, forceAccum, inverseMass);
        // Update linear velocity from the acceleration.
        // new_v = old_v + a * t;
        Vec3.scaleAndAdd(velocity, velocity, resultingAcc, duration);
        // Impose drag.
        // damping 1
        // Vec3.multiplyScalar(velocity, velocity, Math.pow(damping, duration));
        // damping 2
        Vec3.multiplyScalar(velocity, velocity, Math.pow(1 - damping, duration));
    }
}
