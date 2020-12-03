/**
 * @packageDocumentation
 * @module physics
 */

import {
    ccclass,
    help,
    menu,
    serializable,
    formerlySerializedAs,
    type,
} from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { Constraint } from './constraint';
import { IVec3Like, Vec3 } from '../../../../core';
import { EConstraintType } from '../../physics-enum';
import { IHingeConstraint } from '../../../spec/i-physics-constraint';

@ccclass('cc.HingeConstraint')
@help('i18n:cc.HingeConstraint')
@menu('Physics/HingeConstraint(beta)')
export class HingeConstraint extends Constraint {
    @type(Vec3)
    get pivotA (): Vec3 {
        return this._pivotA;
    }

    set pivotA (v: Vec3) {
        Vec3.copy(this._pivotA, v);
        if (!EDITOR) {
            this.constraint.setPivotA(this._pivotA);
        }
    }

    @type(Vec3)
    get pivotB (): Vec3 {
        return this._pivotB;
    }

    set pivotB (v: Vec3) {
        Vec3.copy(this._pivotB, v);
        if (!EDITOR) {
            this.constraint.setPivotB(this._pivotB);
        }
    }

    @type(Vec3)
    get axis (): Vec3 {
        return this._axis;
    }

    set axis (v: Vec3) {
        Vec3.copy(this._axis, v);
        if (!EDITOR) {
            this.constraint.setAxisA(this._axis);
        }
    }

    @serializable
    @formerlySerializedAs('axisA')
    private readonly _axis: Vec3 = new Vec3();

    @serializable
    @formerlySerializedAs('pivotA')
    private readonly _pivotA: Vec3 = new Vec3();

    @serializable
    @formerlySerializedAs('pivotB')
    private readonly _pivotB: Vec3 = new Vec3();

    get constraint (): IHingeConstraint {
        return this._constraint as IHingeConstraint;
    }

    constructor () {
        super(EConstraintType.HINGE);
    }
}
