import {
    ccclass,
    help,
    executeInEditMode,
    menu,
    requireComponent,
    disallowMultiple,
    tooltip,
    displayOrder,
    serializable,
    type,
} from 'cc.decorator';
import { Component, Vec3 } from "../../core";
import { property } from '../../core/data/class-decorator';
import { Particle } from '../particle';

@ccclass('cc.ParticleCom')
@help('i18n:cc.ParticleCom')
@menu('Simulator/ParticleCom')
@disallowMultiple
export class ParticleCom extends Component {

    @property
    damping = 0;

    @property
    mass = 1;

    @property
    velocity = new Vec3();

    @property
    acceleration = new Vec3();

    @property
    force = new Vec3();

    @property
    fixedTime = 1 / 60;

    accumulator = 0;

    readonly impl = new Particle();

    onLoad () {
        this.impl.mass = this.mass;
        this.impl.inverseMass = 1 / this.mass;
        this.impl.damping = this.damping;
        Vec3.copy(this.impl.position, this.node.worldPosition);
        Vec3.copy(this.impl.velocity, this.velocity);
        Vec3.copy(this.impl.acceleration, this.acceleration);
        Vec3.copy(this.impl.forceAccum, this.force);
    }

    update (dt: number) {
        if (this.node.hasChangedFlags) {
            Vec3.copy(this.impl.position, this.node.worldPosition);
        }
        this.accumulator += dt;
        while (this.accumulator > this.fixedTime) {
            this.impl.integrate(this.fixedTime);
            this.accumulator -= this.fixedTime;
        }
        this.impl.forceAccum.set(0, 0, 0);
        this.node.setWorldPosition(this.impl.position);
    }
}
