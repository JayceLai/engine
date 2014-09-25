    
// Setup PIXI

PIXI.dontSayHello = true;
PIXI.DisplayObject.prototype.updateTransform = function () {};

/**
 * The web renderer implemented rely on pixi.js
 */
var RenderContext = (function () {

    /**
     * render context 将在 pixi 中维护同样的 scene graph，这样做主要是为之后的 clipping 和 culling 提供支持。
     * 这里采用空间换时间的策略，所有 transform 都有对应的 PIXI.DisplayObjectContainer。
     * 毕竟一般 dummy entity 不会很多，因此这样产生的冗余对象可以忽略。
     * 
     * @param {number} width
     * @param {number} height
     * @param {Canvas} [canvas]
     */
    function RenderContext (width, height, canvas/*, showGizmos*/) {
        width = width || 800;
        height = height || 600;
        //showGizmos = typeof showGizmos !== 'undefined' ? showGizmos : false;

        var transparent = false;
        var antialias = false;
        this.stage = new PIXI.Stage(0x000000);
        this.renderer = PIXI.autoDetectRenderer(width, height, canvas, transparent, antialias);

        //this.showGizmos = showGizmos;

        // the shared render context that allows display the object which marked as FIRE.ObjectFlags.SceneGizmo
        this.scene = null;

        // binded camera, if supplied the scene will always rendered by this camera
        this._camera = null;

        //// table stores pixi objects in this stage, they looked up by the hashKey of corresponding scene objects.
        //this._pixiObjects = {};

    }

    var emptyTexture = new PIXI.Texture(new PIXI.BaseTexture());

    // static

    RenderContext.initRenderer = function (renderer) {
        renderer._renderObj = null;
        renderer._renderObjInScene = null;
    };

    // properties

    Object.defineProperty(RenderContext.prototype, 'canvas', {
        get: function () {
            return this.renderer.view;
        }
    });

    Object.defineProperty(RenderContext.prototype, 'size', {
        get: function () {
            return new Vec2(this.renderer.width, this.renderer.height);
        },
        set: function (value) {
            this.renderer.resize(value.x, value.y);
            // auto resize scene view camera
            if (this._camera && (this._camera.entity._objFlags & FIRE.ObjectFlags.EditorOnly)) {
                this._camera.size = value.y;
            }
        }
    });

    Object.defineProperty(RenderContext.prototype, 'camera', {
        get: function () {
            return this._camera;
        },
        set: function (value) {
            this._camera = value;
            value.renderContext = this;
        }
    });

    // functions

    RenderContext.prototype.render = function () {
        this.renderer.render(this.stage);
    };

    /**
     * @param {FIRE.Transform} transform
     */
    RenderContext.prototype.createNode = function (transform) {
        if (!(transform.entity._objFlags & SceneGizmo)) {
            // TODO: what if parent is gizmo but children not?
            transform._pixiObj = new PIXI.DisplayObjectContainer();
            if (Engine._canModifyCurrentScene) {
                // attach node if created dynamically
                this.stage.addChild(transform._pixiObj);
            }
        }
        if (this.scene) {
            transform._pixiObjInScene = new PIXI.DisplayObjectContainer();
            if (Engine._canModifyCurrentScene) {
                // attach node if created dynamically
                this.scene.stage.addChild(transform._pixiObjInScene);
            }
        }
    };

    /**
     * @param {FIRE.Transform} transform
     */
    RenderContext.prototype.removeNode = function (transform) {
        if (transform.parent && (transform.parent.entity._objFlags & Destroying)) {
            // parent already removed
            return;
        }
        if (!(transform.entity._objFlags & SceneGizmo)) {
            transform._pixiObj.parent.removeChild(transform._pixiObj);
        }
        if (this.scene) {
            transform._pixiObjInScene.parent.removeChild(transform._pixiObjInScene);
        }
    };

    /**
     * @param {FIRE.Transform} transform
     * @param {FIRE.Transform} oldParent
     */
    RenderContext.prototype.updateNodeParent = function (transform, oldParent) {
        if (transform._pixiObj) {
            if (transform.parent) {
                transform.parent._pixiObj.addChild(transform._pixiObj);
            }
            else {
                this.stage.addChild(transform._pixiObj);
            }
        }
        if (this.scene) {
            if (transform.parent) {
                transform.parent._pixiObjInScene.addChild(transform._pixiObjInScene);
            }
            else {
                this.scene.stage.addChild(transform._pixiObjInScene);
            }
        }
    };

    /**
     * @param {FIRE.Transform} transform
     * @param {number} newIndex
     * @param {number} oldIndex
     */
    RenderContext.prototype.updateNodeSiblingIndex = function (transform, newIndex, oldIndex) {
        var item = transform._pixiObj;
        var array = null;
        if (item) {
            array = item.parent.children;
            array.splice(oldIndex, 1);
            if (newIndex < array.length) {
                array.splice(newIndex, 0, item);
            }
            else {
                array.push(item);
            }
        }

        if (this.scene) {
            item = transform._pixiObjInScene;
            array = item.parent.children;
            array.splice(oldIndex, 1);
            if (newIndex < array.length) {
                array.splice(newIndex, 0, item);
            }
            else {
                array.push(item);
            }
        }
    };

    RenderContext.prototype.onLaunchScene = function (scene) {
        // create root nodes
        var entities = scene.entities;
        var i = 0, len = entities.length;
        for (; i < len; i++) {
            var objInGame = entities[i].transform._pixiObj;
            if (objInGame) {
                this.stage.addChild(objInGame);
            }
        }
        if (this.scene) {
            for (i = 0; i < len; i++) {
                this.scene.stage.addChild(entities[i].transform._pixiObjInScene);
            }
        }
    };

    RenderContext.prototype.onSceneLoaded = function (scene) {
        // create nodes
        var entities = scene.entities;
        var i = 0, len = entities.length;
        for (; i < len; i++) {
            this.onEntityLoaded(entities[i]);
        }
    };

    RenderContext.prototype.onEntityLoaded = function (entity) {
        // create node recursively
        // TODO:
    };
    
    /**
     * @param {FIRE.SpriteRenderer} target
     */
    RenderContext.prototype.addSprite = function (target) {
        var tex = createTexture(target.sprite) || emptyTexture;
        var transform = target.entity.transform;

        var inGame = !(target.entity._objFlags & SceneGizmo);
        if (inGame) {
            target._renderObj = new PIXI.Sprite(tex);
            transform._pixiObj.addChildAt(target._renderObj, 0);
        }

        if (this.scene) {
            // pixi can not share display object between stages at the same time, 
            // so another sprite is needed.
            target._renderObjInScene = new PIXI.Sprite(tex);
            transform._pixiObjInScene.addChildAt(target._renderObjInScene, 0);
        }
    };

    /**
     * @param {FIRE.SpriteRenderer} target
     * @param {boolean} show
     */
    RenderContext.prototype.show = function (target, show) {
        if (target._renderObj) {
            target._renderObj.visible = show;
        }
        if (target._renderObjInScene) {
            target._renderObjInScene.visible = show;
        }
    };

    /**
     * @param target {FIRE.SpriteRenderer}
     * @param show {boolean}
     */
    RenderContext.prototype.remove = function (target) {
        if (target._renderObj) {
            target._renderObj.parent.removeChild(target._renderObj);
            target._renderObj = null;
        }
        if (target._renderObjInScene) {
            target._renderObjInScene.parent.removeChild(target._renderObjInScene);
            target._renderObjInScene = null;
        }
    };

    /**
     * @param target {FIRE.SpriteRenderer}
     */
    RenderContext.prototype.updateMaterial = function (target) {
        if (target._renderObj || target._renderObjInScene) {
            var tex = createTexture(target.sprite) || emptyTexture;
            if (target._renderObj) {
                target._renderObj.setTexture(tex);
            }
            if (target._renderObjInScene) {
                target._renderObjInScene.setTexture(tex);
            }
        }
        else {
            console.error('' + target + ' must be added to render context first!');
        }
    };

    /**
     * @param target {FIRE.SpriteRenderer}
     */
    RenderContext.prototype.updateTransform = function (target) {
        if (target._renderObj || target._renderObjInScene) {
            if (target._renderObj) {
                target._renderObj.worldTransform = target.transform._worldTransform;
            }
            if (target._renderObjInScene) {
                target._renderObjInScene.worldTransform = target.transform._worldTransform;
            }
        }
        else {
            console.error('' + target + ' must be added to render context first!');
        }
    };

    ///**
    // * @param {FIRE.SpriteRenderer} target
    // * @param {FIRE.SpriteRenderer} transform
    // * @param {FIRE.SpriteRenderer} oldParent
    // */
    //RenderContext.prototype.updateHierarchy = function (target, transform, oldParent) {
    //    if (target._renderObj || target._renderObjInScene) {
    //        if (transform._parent === oldParent) {
    //            // oldAncestor changed its sibling index
    //            if (target._renderObj) {
    //                this._updateSiblingIndex(transform);
    //            }
    //            if (target._renderObjInScene) {
    //                this.scene._updateSiblingIndex(transform);
    //            }
    //            return true;
    //        }
    //        else {
    //            // parent changed
    //        }
    //    }
    //    else {
    //        console.error('' + target + ' must be added to render context first!');
    //    }
    //    return false;
    //};

    //RenderContext.prototype._updateSiblingIndex = function (transform) {
    //    var pixiNode = this._pixiObjects[transform.hashKey];
    //    var array = pixiNode.parent.children;
    //    var oldIndex = array.indexOf(pixiNode);
    //    var newIndex = transform.getSiblingIndex(); // TODO: 如果前面的节点包含空的entity，则这个new index会有问题
    //    // skip entities not exists in pixi
    //    while ((--newIndex) > 0) {
    //        var previous = transform.getSibling(newIndex);
    //        if (previous.hashKey) {
    //        }
    //    }
    //    array.splice(oldIndex, 1);
    //    if (newIndex < array.length) {
    //        array.splice(newIndex, 0, pixiNode);
    //    }
    //    else {
    //        array.push(pixiNode);
    //    }
    //};

    /**
     * @param sprite {FIRE.Sprite}
     */
    function createTexture(sprite) {
        if (sprite && sprite.texture && sprite.texture.image) {
            var img = new PIXI.BaseTexture(sprite.texture.image);
            var frame = new PIXI.Rectangle(sprite.x, sprite.y, Math.min(img.width - sprite.x, sprite.width), Math.min(img.height - sprite.y, sprite.height));
            return new PIXI.Texture(img, frame);
        }
        else {
            return null;
        }
    }

    return RenderContext;
})();
