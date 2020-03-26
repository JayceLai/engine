import { BULLET } from './../bullet-export';
import { Vec3, absMax } from "../../../core";
import { BulletShape } from "./bullet-shape";
import { CapsuleColliderComponent } from '../../../../exports/physics-framework';
import { cocos2BulletVec3 } from '../bullet-util';
import { btBroadphaseNativeTypes } from '../bullet-enum';
import { ICapsuleShape } from '../../spec/i-physics-shape';
import { IVec3Like } from '../../../core/math/type-define';

export class BulletCapsuleShape extends BulletShape implements ICapsuleShape {

    setHeight (v: number) {
        this.updateProperties(
            this.collider.radius,
            this.collider.height,
            this.collider.direction,
            this._collider.node.worldScale
        );
        if (this._btCompound) {
            BULLET.btCompoundShape_updateChildTransform(this._btCompound, this._index, this.transform);
        }
    }

    setDirection (v: number) {
        this.updateProperties(
            this.collider.radius,
            this.collider.height,
            this.collider.direction,
            this._collider.node.worldScale
        );
        if (this._btCompound) {
            BULLET.btCompoundShape_updateChildTransform(this._btCompound, this._index, this.transform);
        }
    }

    setRadius (v: number) {
        this.updateProperties(
            this.collider.radius,
            this.collider.height,
            this.collider.direction,
            this._collider.node.worldScale
        );
        if (this._btCompound) {
            BULLET.btCompoundShape_updateChildTransform(this._btCompound, this._index, this.transform);
        }
    }

    get impl () {
        return this._btShape;
    }

    get collider () {
        return this._collider as CapsuleColliderComponent;
    }

    constructor () {
        super(btBroadphaseNativeTypes.CAPSULE_SHAPE_PROXYTYPE);
        this._btShape = BULLET.btCapsuleShape_create(0.5, 1);
    }

    onLoad () {
        super.onLoad();
        this.setRadius(this.collider.radius);
    }

    setScale () {
        super.setScale();
        this.setRadius(this.collider.radius);
    }

    updateProperties (radius: number, height: number, direction: number, scale: IVec3Like) {
        const ws = scale;
        const upAxis = direction;
        if (upAxis == 1) {
            const wh = height * Math.abs(ws.y);
            const wr = radius * Math.abs(absMax(ws.x, ws.z));
            const halfH = (wh - wr * 2) / 2;
            BULLET.btCapsuleShape_updateProp(this.impl, wr, halfH, upAxis);
        } else if (upAxis == 0) {
            const wh = height * Math.abs(ws.x);
            const wr = radius * Math.abs(absMax(ws.y, ws.z));
            const halfH = (wh - wr * 2) / 2;
            BULLET.btCapsuleShape_updateProp(this.impl, wr, halfH, upAxis);
        } else {
            const wh = height * Math.abs(ws.z);
            const wr = radius * Math.abs(absMax(ws.x, ws.y));
            const halfH = (wh - wr * 2) / 2;
            BULLET.btCapsuleShape_updateProp(this.impl, wr, halfH, upAxis);
        }
    }
}
