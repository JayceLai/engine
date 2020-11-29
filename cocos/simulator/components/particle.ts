import { ccclass, help, menu, disallowMultiple } from 'cc.decorator';
import { Component, Vec3 } from "../../core";
import { property } from '../../core/data/class-decorator';

@ccclass('cc.simulator.Particle')
@help('i18n:cc.simulator.Particle')
@menu('Simulator/Particle')
@disallowMultiple
export class Particle extends Component {

    /**
    * Holds the amount of damping applied to linear
    * motion. Damping is required to remove energy added
    * through numerical instability in the integrator.
    */
    @property
    damping = 0;

    /**
    * Holds the inverse of the mass of the particle. It
    * is more useful to hold the inverse mass because
    * integration is simpler and because in real-time
    * simulation it is more useful to have objects with
    * infinite mass (immovable) than zero mass
    * (completely unstable in numerical simulation).
    */
    @property
    mass = 1;
    inverseMass = 1;

    /**
     * Holds the linear velocity of the particle in
     * world space.
     */
    @property
    velocity = new Vec3();

    /**
     * Holds the acceleration of the particle. This value
     * can be used to set acceleration due to gravity (its primary
     * use) or any other constant acceleration.
     */
    @property
    acceleration = new Vec3();

    /**
     * Holds the total force of the particle.
     */
    @property
    force = new Vec3();

    /**
     * Holds the fixed simulation time of the particle.
     */
    @property
    fixedTime = 1 / 60;

    @property
    k1 = 0;

    @property
    k2 = 0;

    /**
     * 总的累计时间
     */
    accumulator = 0;

    position = new Vec3();

    __preload () {
        this.inverseMass = 1 / this.mass;
    }

    update (dt: number) {
        if (this.node.hasChangedFlags) {
            Vec3.copy(this.position, this.node.worldPosition);
        }
        this.accumulator += dt;
        while (this.accumulator > this.fixedTime) {
            this.updateForce(this.fixedTime);
            this.integrate(this.fixedTime);
            this.clearForce();
            this.accumulator -= this.fixedTime;
        }
        this.node.setWorldPosition(this.position);
    }

    integrate (duration: number): void {
        // assert(duration > 0.0);
        const position = this.position;
        const velocity = this.velocity;
        const acceleration = this.acceleration;
        const forceAccum = this.force;
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

    clearForce () {
        this.force.set(0, 0, 0);
    }

    addForce (force: Vec3) {
        this.force.add(force);
    }

    updateForce (duration: number): void {
        // 作用力： 重力，使用重力加速度方案代替
        // this.addForce(gravity*mass)

        // 作用力： 空气阻力，与速度相关， fdrag = −˙p * k1 * |˙p| + k2 * |˙p|2
        // 速度较小时，主要受到 k1 系数的影响；速度较大时，主要受到 k2 系数的影响；
        const speed = this.velocity.length();
        const dragCoeff = this.k1 * speed + this.k2 * speed * speed;
        const dragForce = Vec3.multiplyScalar(new Vec3(), this.velocity, -dragCoeff);
        this.addForce(dragForce);
    }
}
