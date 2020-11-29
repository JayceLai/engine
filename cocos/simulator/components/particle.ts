import { ccclass, help, menu, disallowMultiple, ccclass } from 'cc.decorator';
import { Component, Enum, Vec3 } from "../../core";
import { property } from '../../core/data/class-decorator';

export enum EBodyType {
    STATIC = 1,
    DYNAMIC = 2,
    KINEMATIC = 4,
}
Enum(EBodyType);

@ccclass('cc.simulator.Particle')
@help('i18n:cc.simulator.Particle')
@menu('Simulator/Particle')
@disallowMultiple
export class Particle extends Component {

    @property({ type: EBodyType })
    type = EBodyType.DYNAMIC;

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
    gravityForce = new GravityForce();

    @property
    dragForce = new DragForce();

    @property
    springForce = new SpringForce();

    @property
    bouyancyForce = new BuoyancyForce();

    /**
     * 总的累计时间
     */
    accumulator = 0;

    position = new Vec3();
    initPosition = new Vec3();

    __preload () {
        this.inverseMass = this.mass <= 0 ? 0 : 1 / this.mass;
    }

    onLoad () {
        Vec3.copy(this.initPosition, this.node.worldPosition);
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
        if ((this.type & EBodyType.DYNAMIC) === 0) return;
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
        if ((this.type & EBodyType.DYNAMIC) === 0) return;
        this.force.add(force);
    }

    updateForce (duration: number): void {
        if ((this.type & EBodyType.DYNAMIC) === 0) return;
        this.gravityForce.updateForce(this, duration);
        this.dragForce.updateForce(this, duration);
        this.springForce.updateForce(this, duration);
    }
}

interface ForceGenerator {
    updateForce (p: Particle, dt: number): void;
}

@ccclass('cc.simulator.GravityForce')
class GravityForce implements ForceGenerator {

    @property
    gravity = new Vec3(0, -10, 0);

    updateForce (p: Particle, dt: number) {
        p.addForce(Vec3.multiplyScalar(new Vec3(), this.gravity, p.mass));
    }
}
// cclegacy.GravityForce = GravityForce;

@ccclass('cc.simulator.DragForce')
class DragForce implements ForceGenerator {

    @property
    k1 = 0;

    @property
    k2 = 0;

    updateForce (p: Particle, dt: number) {
        // 作用力： 空气阻力，与速度相关， fdrag = −˙p * k1 * |˙p| + k2 * |˙p|2
        // 速度较小时，主要受到 k1 系数的影响；速度较大时，主要受到 k2 系数的影响；
        const speed = p.velocity.length();
        const dragCoeff = this.k1 * speed + this.k2 * speed * speed;
        const dragForce = Vec3.multiplyScalar(new Vec3(), p.velocity, -dragCoeff);
        p.addForce(dragForce);
    }
}

@ccclass('cc.simulator.SpringForce')
class SpringForce implements ForceGenerator {

    // 弹簧劲/刚度系数
    @property
    k = 0;

    // 弹簧静止长度
    @property
    L = 1;

    // 弹簧链接的另一个质点
    @property(Particle)
    other: Particle | null = null;

    // 锚点
    @property
    anchor = new Vec3();

    @property
    bungee = false;

    updateForce (p: Particle, dt: number) {
        if (this.k == 0) return;
        // 根据胡克定律 F = k * △X
        let dir = Vec3.subtract(new Vec3(), p.position, this.other ? this.other.position : p.initPosition);
        dir.subtract(this.anchor);
        let DX = this.L - dir.length();
        if (DX == 0) return;
        // 橡皮筋仅在拉伸时施加弹力
        if (this.bungee && DX < 0) return;
        dir.normalize();
        let F = dir.multiplyScalar(this.k * DX);
        p.addForce(F);
        if (this.other) this.other.addForce(F.multiplyScalar(-1));
    }
}

@ccclass('cc.simulator.BuoyancyForce')
class BuoyancyForce implements ForceGenerator {

    @property
    maxDepth: number = 1;

    @property
    volume: number = 1;

    @property
    waterHeight: number = Number.MIN_VALUE;

    @property
    liquidDensity: number = 1000; // kg / m³

    updateForce (p: Particle, dt: number): void {
        /**
         * s 表示最大的潜入深度，在该值时对象将会完全潜入
         * d 表示侵入量
         * y0 表示质点高度，yw 表示水面高度
         * 
         * d = (y0 - yw - s)/(2 * s)
         * 
         * d <= 0            0
         * d >= 1            volume * density
         * 0 <  d  <  1      d * volume * density
         */
        if (p.position.y >= this.waterHeight + this.maxDepth) return;

        let bouyancy = new Vec3();
        if (p.position.y <= this.waterHeight - this.maxDepth) {
            bouyancy.y = this.liquidDensity * this.volume;
            p.addForce(bouyancy);
        } else {
            let d = (p.position.y - this.waterHeight - this.maxDepth) / 2 * this.maxDepth; // (2 * this.maxDepth) ?
            bouyancy.y = this.liquidDensity * this.volume * d;
            p.addForce(bouyancy);
        }
    }
}
