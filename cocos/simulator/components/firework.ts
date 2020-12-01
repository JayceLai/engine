import { Component, instantiate, Node, Prefab, randomRange, randomVec3, Vec2, Vec3 } from "../../core";
import { ccclass, disallowMultiple, help, menu, property } from "../../core/data/class-decorator";
import { Particle } from "./particle";

export class Firework extends Particle {
    /**
     * 用于标记烟火粒子的激活状态
     */
    state = 1;

    /**
     * 用于标记烟火粒子的生命
     */
    age = 5;

    update (dt: number) {
        if (this.state == 0) return;
        // Update our physical state
        super.update(dt);
        // We work backward from our age to zero.
        this.age -= dt;
        if (this.age <= 0) this.state = 0;
    }
}

@ccclass("cc.simulator.ParticleTemplate")
export class ParticleTemplate {
    @property
    type = 1;
    @property
    count = 10;

    @property
    name = "DEFAULT";
    @property
    damping = 0.1;
    @property
    mass = 1;
    // @property
    // velocity = new Vec3();
    @property
    acceleration = new Vec3(0, -10, 0);
    // @property
    // force = new Vec3();
    @property
    fixedTime = 1 / 60;
    @property({ type: Prefab })
    render: Prefab = null as any;
}

@ccclass("cc.simulator.RangeNum")
export class RangeNum {
    @property
    min = 0;
    @property
    max = 1;
}

@ccclass("cc.simulator.RangeVec3")
export class RangeVec3 {
    @property
    min = new Vec3();
    @property
    max = new Vec3(1, 1, 1);
}

/**
 * 用于制定烟火粒子的模拟规则
 */
@ccclass('cc.simulator.FireworkSystem')
@help('i18n:cc.simulator.FireworkSystem')
@menu('Simulator/FireworkSystem')
@disallowMultiple
export class FireworkSystem extends Component {
    //#region system
    // 所有负载
    @property({ type: [ParticleTemplate] })
    templates: ParticleTemplate[] = [];

    //#region firework
    // 生命范围
    @property({ type: RangeNum })
    age = new RangeNum();

    // 速度范围
    @property({ type: RangeVec3 })
    velocity = new RangeVec3();

    // 是否循环
    @property
    loop = true;

    fireworks: Firework[] = [];

    /**
    * Creates a new firework of this type and writes it into the given
    * instance. The optional parent firework is used to base position
    * and velocity on.
    */
    createFireWork (template: ParticleTemplate) {
        const node = instantiate(template.render);
        this.node.addChild(node);
        const firework = node.addComponent(Firework);
        firework.state = 1;
        firework.enabled = false;
        firework.age = randomRange(this.age.min, this.age.max);
        randomVec3(this.velocity.min, this.velocity.max, firework.velocity);

        // We use a mass of 1 in all cases (no point having fireworks
        // with different masses, since they are only under the influence
        // of gravity).
        firework.mass = template.mass;
        firework.damping = template.damping;
        firework.fixedTime = template.fixedTime;
        Vec3.copy(firework.acceleration, template.acceleration);
        this.fireworks.push(firework);
    }

    start () {
        for (let i = 0; i < this.templates.length; i++) {
            const element = this.templates[i];
            for (let i = 0; i < element.count; i++)
                this.createFireWork(element);
        }
    }

    update (dt: number) {
        const len = this.fireworks.length;
        let dirty = true;
        for (let i = 0; i < len; i++) {
            if (this.fireworks[i].state != 0) dirty = false;
            this.fireworks[i].update(dt);
        }
        if (this.loop && dirty) {
            this.reset();
        }
    }

    reset () {
        let curI = 0;
        for (let i = 0; i < this.templates.length; i++) {
            const element = this.templates[i];
            for (let j = 0; j < element.count; j++) {
                const fw = this.fireworks[curI];
                fw.state = 1;
                fw.accumulator = 0;
                Vec3.copy(fw.position, this.node.worldPosition);
                fw.age = randomRange(this.age.min, this.age.max);
                randomVec3(this.velocity.min, this.velocity.max, fw.velocity);
                curI++;
            }
        }
    }
}